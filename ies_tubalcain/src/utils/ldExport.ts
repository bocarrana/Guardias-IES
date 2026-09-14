/**
 * ldExport.ts — Exportación de informes de Libre Disposición a PDF y Excel.
 *
 * Genera documentos con formato profesional agrupados por meses o semanas.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { LibreDisposicion, LdTipo } from '../services/supabaseClient';

// ─── Constantes ────────────────────────────────────────────

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const BRAND_RGB: [number, number, number] = [6, 182, 212];
const BRAND_LIGHT: [number, number, number] = [224, 247, 250];
const HEADER_TEXT: [number, number, number] = [255, 255, 255];
const ALT_ROW: [number, number, number] = [248, 250, 252];

// ─── Tipos internos ────────────────────────────────────────

interface LdRow {
    profesor: string;
    departamento: string;
    fecha: string;
    diaSemana: string;
    tipo: LdTipo;
    tipoLabel: string;
    fechaObj: Date;
}

export type ExportGrouping = 'month' | 'week';
export type ExportFormat = 'pdf' | 'excel';

// ─── Utilidades ────────────────────────────────────────────

const parseDate = (fecha: string): Date => new Date(fecha + 'T00:00:00');

const formatDateEs = (d: Date): string =>
    `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

const getISOWeek = (d: Date): number => {
    const tmp = new Date(d.getTime());
    tmp.setHours(0, 0, 0, 0);
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
    const yearStart = new Date(tmp.getFullYear(), 0, 4);
    return 1 + Math.round(((tmp.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7);
};

const getWeekRange = (d: Date): string => {
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day === 0 ? 7 : day) - 1));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return `${formatDateEs(monday)} – ${formatDateEs(friday)}`;
};

const getGroupKey = (d: Date, grouping: ExportGrouping): string => {
    if (grouping === 'month') {
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    }
    return `${d.getFullYear()}-W${getISOWeek(d).toString().padStart(2, '0')}`;
};

const getGroupLabel = (key: string, grouping: ExportGrouping): string => {
    if (grouping === 'month') {
        const [year, month] = key.split('-');
        return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
    }
    const [year, week] = key.split('-W');
    return `Semana ${parseInt(week)} — ${year}`;
};

const buildRows = (records: LibreDisposicion[]): LdRow[] =>
    records
        .map(r => {
            const d = parseDate(r.fecha);
            return {
                profesor: r.teacher?.name || r.profesor_id,
                departamento: r.teacher?.department || '—',
                fecha: r.fecha,
                diaSemana: DAY_NAMES[d.getDay()],
                tipo: r.tipo || 'ordinario',
                tipoLabel: r.tipo === 'causa_sobrevenida' ? 'Causa sobrevenida' : 'Ordinario',
                fechaObj: d,
            };
        })
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.profesor.localeCompare(b.profesor));

const groupRows = (rows: LdRow[], grouping: ExportGrouping): Map<string, LdRow[]> => {
    const groups = new Map<string, LdRow[]>();
    rows.forEach(r => {
        const key = getGroupKey(r.fechaObj, grouping);
        const list = groups.get(key) || [];
        list.push(r);
        groups.set(key, list);
    });
    return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
};

// ─── Resumen por profesor ──────────────────────────────────

interface ProfesorResumen {
    nombre: string;
    departamento: string;
    diasUtilizados: number;
    tipos: string;
    fechas: string[];
}

const buildResumen = (rows: LdRow[]): ProfesorResumen[] => {
    const map = new Map<string, ProfesorResumen & { _tipoSet: Set<string> }>();
    rows.forEach(r => {
        const existing = map.get(r.profesor);
        if (existing) {
            existing.diasUtilizados++;
            existing.fechas.push(`${r.diaSemana} ${formatDateEs(r.fechaObj)}`);
            existing._tipoSet.add(r.tipoLabel);
            existing.tipos = [...existing._tipoSet].join(', ');
        } else {
            const tipoSet = new Set([r.tipoLabel]);
            map.set(r.profesor, {
                nombre: r.profesor,
                departamento: r.departamento,
                diasUtilizados: 1,
                tipos: r.tipoLabel,
                fechas: [`${r.diaSemana} ${formatDateEs(r.fechaObj)}`],
                _tipoSet: tipoSet,
            });
        }
    });
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
};

// ─── PDF Export ─────────────────────────────────────────────

export const exportLdPDF = (
    records: LibreDisposicion[],
    grouping: ExportGrouping,
    filterMonth?: string,
    filterDay?: string,
    filterTeacher?: string,
    maxLdPerTeacher: number = 4
) => {
    let allRows = buildRows(records);
    if (filterTeacher) {
        const q = filterTeacher.toLowerCase();
        allRows = allRows.filter(r => r.profesor.toLowerCase().includes(q));
    }

    // ── Modo Parte Diario (si hay día filtrado) ──
    if (filterDay) {
        const dayRows = allRows.filter(r => r.fecha === filterDay);
        if (dayRows.length === 0) return;

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const dateObj = parseDate(filterDay);
        const dayName = DAY_NAMES[dateObj.getDay()];
        const formattedDate = `${dayName}, ${formatDateEs(dateObj)}`;

        // Header band
        doc.setFillColor(15, 23, 42); // Dark slate
        doc.rect(0, 0, pageWidth, 52, 'F');

        doc.setFillColor(...BRAND_RGB);
        doc.rect(0, 48, pageWidth, 4, 'F');

        doc.setTextColor(...HEADER_TEXT);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Parte Diario de Libre Disposición', 14, 24);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${formattedDate}`, 14, 34);

        const now = new Date();
        const generatedStr = `Generado el ${formatDateEs(now)} a las ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        doc.setFontSize(8.5);
        doc.setTextColor(200, 200, 200);
        doc.text(generatedStr, pageWidth - 14, 34, { align: 'right' });

        doc.setTextColor(0, 0, 0);

        // Tabla de profesores
        autoTable(doc, {
            startY: 60,
            head: [['#', 'Profesor / Docente', 'Departamento', 'Tipo de Permiso', 'Firma / Cotejo']],
            body: dayRows.map((r, i) => [
                (i + 1).toString(),
                r.profesor,
                r.departamento,
                r.tipoLabel,
                '', // Espacio para firma
            ]),
            theme: 'grid',
            headStyles: {
                fillColor: BRAND_RGB,
                textColor: HEADER_TEXT,
                fontStyle: 'bold',
                fontSize: 9.5,
                halign: 'left',
            },
            bodyStyles: { fontSize: 9, cellPadding: 6 },
            alternateRowStyles: { fillColor: ALT_ROW },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 55, fontStyle: 'bold' },
                2: { cellWidth: 45 },
                3: { cellWidth: 35 },
                4: { cellWidth: 'auto' },
            },
            margin: { left: 14, right: 14 },
        });

        // Summary box
        const finalY = (doc as any).lastAutoTable?.finalY || 100;
        doc.setFillColor(...BRAND_LIGHT);
        doc.roundedRect(14, finalY + 8, pageWidth - 28, 14, 3, 3, 'F');
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text(
            `Total de permisos concedidos: ${dayRows.length} docente${dayRows.length !== 1 ? 's' : ''}`,
            pageWidth / 2, finalY + 17, { align: 'center' }
        );

        // Footer
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('Guardias IES — Sistema de Gestión de Guardias y Permisos', 14, pageHeight - 8);
        doc.text('Página 1 de 1', pageWidth - 14, pageHeight - 8, { align: 'right' });

        doc.save(`parte_libre_disposicion_${filterDay}.pdf`);
        return;
    }

    const filtered = filterMonth
        ? allRows.filter(r => r.fecha.startsWith(filterMonth))
        : allRows;

    if (filtered.length === 0) return;

    const groups = groupRows(filtered, grouping);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // ── Portada ──
    doc.setFillColor(15, 23, 42); // Dark slate
    doc.rect(0, 0, pageWidth, 60, 'F');

    doc.setFillColor(...BRAND_RGB);
    doc.rect(0, 56, pageWidth, 4, 'F');

    doc.setTextColor(...HEADER_TEXT);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Informe de Libre Disposición', 14, 28);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const now = new Date();
    const generatedStr = `Generado el ${formatDateEs(now)} a las ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    doc.text(generatedStr, 14, 38);

    const periodLabel = filterMonth
        ? getGroupLabel(filterMonth, 'month')
        : 'Curso completo';
    doc.text(`Período: ${periodLabel}${filterTeacher ? `  ·  Profesor: ${filterTeacher}` : ''}  ·  Agrupado por: ${grouping === 'month' ? 'Meses' : 'Semanas'}`, 14, 46);

    doc.setTextColor(0, 0, 0);

    // ── Resumen general ──
    let yPos = 72;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_RGB);
    doc.text('Resumen por Profesor', 14, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 4;

    const resumen = buildResumen(filtered);
    autoTable(doc, {
        startY: yPos,
        head: [['Profesor', 'Departamento', 'Días utilizados', 'Tipo', 'Detalle de fechas']],
        body: resumen.map(r => [
            r.nombre,
            r.departamento,
            `${r.diasUtilizados}/${maxLdPerTeacher}`,
            r.tipos,
            r.fechas.join(', '),
        ]),
        theme: 'grid',
        headStyles: {
            fillColor: BRAND_RGB,
            textColor: HEADER_TEXT,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
        },
        bodyStyles: { fontSize: 8, cellPadding: 4 },
        alternateRowStyles: { fillColor: ALT_ROW },
        columnStyles: {
            0: { cellWidth: 45, fontStyle: 'bold' },
            1: { cellWidth: 35 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 30 },
            4: { cellWidth: 'auto' },
        },
        styles: { overflow: 'linebreak' },
        margin: { left: 14, right: 14 },
    });

    // ── Detalle por grupo ──
    let groupIdx = 0;
    groups.forEach((rows, key) => {
        doc.addPage();
        const label = getGroupLabel(key, grouping);

        // Group header strip
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 22, 'F');
        doc.setFillColor(...BRAND_RGB);
        doc.rect(0, 20, pageWidth, 2, 'F');

        doc.setTextColor(...HEADER_TEXT);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(label, 14, 14);

        // Add week range for week grouping
        if (grouping === 'week' && rows.length > 0) {
            const weekRange = getWeekRange(rows[0].fechaObj);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(weekRange, pageWidth - 14, 14, { align: 'right' });
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`${rows.length} permiso${rows.length !== 1 ? 's' : ''}`, pageWidth - 14, 8, { align: 'right' });

        doc.setTextColor(0, 0, 0);

        autoTable(doc, {
            startY: 28,
            head: [['#', 'Profesor', 'Departamento', 'Fecha', 'Día', 'Tipo']],
            body: rows.map((r, i) => [
                (i + 1).toString(),
                r.profesor,
                r.departamento,
                formatDateEs(r.fechaObj),
                r.diaSemana,
                r.tipoLabel,
            ]),
            theme: 'grid',
            headStyles: {
                fillColor: BRAND_RGB,
                textColor: HEADER_TEXT,
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'left',
            },
            bodyStyles: { fontSize: 9, cellPadding: 5 },
            alternateRowStyles: { fillColor: ALT_ROW },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 48, fontStyle: 'bold' },
                2: { cellWidth: 38 },
                3: { cellWidth: 24, halign: 'center' },
                4: { cellWidth: 24 },
                5: { cellWidth: 30 },
            },
            margin: { left: 14, right: 14 },
        });

        // Subtotal at bottom
        const finalY = (doc as any).lastAutoTable?.finalY || 50;
        doc.setFillColor(...BRAND_LIGHT);
        doc.roundedRect(14, finalY + 6, pageWidth - 28, 14, 3, 3, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);

        const uniqueTeachers = new Set(rows.map(r => r.profesor)).size;
        doc.text(
            `Total: ${rows.length} permiso${rows.length !== 1 ? 's' : ''}  ·  ${uniqueTeachers} profesor${uniqueTeachers !== 1 ? 'es' : ''}`,
            pageWidth / 2, finalY + 14, { align: 'center' }
        );

        groupIdx++;
    });

    // ── Footer en todas las páginas ──
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('Guardias IES — Informe de Libre Disposición', 14, pageHeight - 8);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    }

    // ── Nombre del archivo ──
    const fileLabel = filterMonth
        ? getGroupLabel(filterMonth, 'month').replace(/ /g, '_')
        : 'curso_completo';
    doc.save(`libre_disposicion_${fileLabel}_${grouping === 'week' ? 'semanal' : 'mensual'}.pdf`);
};

// ─── Excel Export ───────────────────────────────────────────

export const exportLdExcel = (
    records: LibreDisposicion[],
    grouping: ExportGrouping,
    filterMonth?: string,
    filterDay?: string,
    filterTeacher?: string,
    maxLdPerTeacher: number = 4
) => {
    let allRows = buildRows(records);
    if (filterTeacher) {
        const q = filterTeacher.toLowerCase();
        allRows = allRows.filter(r => r.profesor.toLowerCase().includes(q));
    }

    // ── Modo Parte Diario (si hay día filtrado) ──
    if (filterDay) {
        const dayRows = allRows.filter(r => r.fecha === filterDay);
        if (dayRows.length === 0) return;

        const wb = XLSX.utils.book_new();
        const dateObj = parseDate(filterDay);
        const dayName = DAY_NAMES[dateObj.getDay()];
        const formattedDate = `${dayName}, ${formatDateEs(dateObj)}`;

        const sheetData = [
            ['PARTE DIARIO DE LIBRE DISPOSICIÓN'],
            [`Fecha: ${formattedDate}`],
            [`Generado: ${formatDateEs(new Date())}`],
            [`Total docentes con permiso: ${dayRows.length}`],
            [],
            ['#', 'Profesor / Docente', 'Departamento', 'Fecha', 'Día', 'Tipo de Permiso'],
            ...dayRows.map((r, i) => [
                i + 1,
                r.profesor,
                r.departamento,
                formatDateEs(r.fechaObj),
                r.diaSemana,
                r.tipoLabel,
            ]),
        ];

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws['!cols'] = [
            { wch: 6 }, { wch: 38 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 24 },
        ];
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        ];

        XLSX.utils.book_append_sheet(wb, ws, `Parte_${filterDay}`);
        XLSX.writeFile(wb, `parte_libre_disposicion_${filterDay}.xlsx`);
        return;
    }

    const filtered = filterMonth
        ? allRows.filter(r => r.fecha.startsWith(filterMonth))
        : allRows;

    if (filtered.length === 0) return;

    const groups = groupRows(filtered, grouping);
    const wb = XLSX.utils.book_new();

    // ── Hoja de Resumen ──
    const resumen = buildResumen(filtered);
    const resumenData = [
        ['INFORME DE LIBRE DISPOSICIÓN'],
        [`Generado: ${formatDateEs(new Date())}`],
        [`Período: ${filterMonth ? getGroupLabel(filterMonth, 'month') : 'Curso completo'}`],
        [`Agrupación: ${grouping === 'month' ? 'Mensual' : 'Semanal'}`],
        [],
        ['RESUMEN POR PROFESOR'],
        ['Profesor', 'Departamento', 'Días utilizados', 'Máximo', 'Restantes', 'Tipo(s)', 'Detalle de fechas'],
        ...resumen.map(r => [
            r.nombre,
            r.departamento,
            r.diasUtilizados,
            maxLdPerTeacher,
            Math.max(0, maxLdPerTeacher - r.diasUtilizados),
            r.tipos,
            r.fechas.join(', '),
        ]),
        [],
        ['ESTADÍSTICAS GENERALES'],
        ['Total de permisos', filtered.length],
        ['Profesores únicos', resumen.length],
        ['Días diferentes', new Set(filtered.map(r => r.fecha)).size],
    ];

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);

    // Column widths
    wsResumen['!cols'] = [
        { wch: 35 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 60 },
    ];

    // Merge title cells
    wsResumen['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 5, c: 0 }, e: { r: 5, c: 6 } },
        { s: { r: resumen.length + 8, c: 0 }, e: { r: resumen.length + 8, c: 6 } },
    ];

    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // ── Hojas por grupo ──
    groups.forEach((rows, key) => {
        const label = getGroupLabel(key, grouping);
        // Sheet names can't exceed 31 chars
        const sheetName = label.length > 31 ? label.substring(0, 31) : label;

        const sheetData = [
            [label.toUpperCase()],
            [`${rows.length} permiso${rows.length !== 1 ? 's' : ''} · ${new Set(rows.map(r => r.profesor)).size} profesor${new Set(rows.map(r => r.profesor)).size !== 1 ? 'es' : ''}`],
            [],
            ['#', 'Profesor', 'Departamento', 'Fecha', 'Día', 'Tipo'],
            ...rows.map((r, i) => [
                i + 1,
                r.profesor,
                r.departamento,
                formatDateEs(r.fechaObj),
                r.diaSemana,
                r.tipoLabel,
            ]),
        ];

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws['!cols'] = [
            { wch: 5 }, { wch: 35 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 20 },
        ];
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        ];

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // ── Guardar ──
    const fileLabel = filterMonth
        ? getGroupLabel(filterMonth, 'month').replace(/ /g, '_')
        : 'curso_completo';
    XLSX.writeFile(wb, `libre_disposicion_${fileLabel}_${grouping === 'week' ? 'semanal' : 'mensual'}.xlsx`);
};
