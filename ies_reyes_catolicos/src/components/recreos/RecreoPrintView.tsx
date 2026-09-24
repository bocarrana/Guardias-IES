import { RECREO_ZONES, DAYS_OF_WEEK, RecreoGrid, formatShortTeacherName } from '../../services/recreoZonesService';
import { Printer, X } from 'lucide-react';

interface RecreoPrintViewProps {
    year: number;
    monthName: string;
    grid1: RecreoGrid;
    grid2: RecreoGrid;
    onClose: () => void;
}

export const RecreoPrintView: React.FC<RecreoPrintViewProps> = ({
    year,
    monthName,
    grid1,
    grid2,
    onClose,
}) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            overflowY: 'auto',
            padding: '24px',
        }}>
            {/* Top Toolbar (Hidden on actual paper print) */}
            <div className="no-print" style={{
                width: '100%',
                maxWidth: '900px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                background: 'var(--bg-card)',
                padding: '12px 20px',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Printer size={20} color="var(--brand-500)" />
                    <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        Vista de Impresión · Cuadrante Oficial de Recreos
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={handlePrint}
                        style={{
                            background: 'var(--brand-500)',
                            color: '#000',
                            fontWeight: 800,
                            padding: '8px 18px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '0.85rem',
                        }}
                    >
                        <Printer size={16} /> Imprimir / Guardar PDF
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            color: 'var(--text-primary)',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.85rem',
                        }}
                    >
                        <X size={16} /> Cerrar
                    </button>
                </div>
            </div>

            {/* Printable A4 Paper Container */}
            <div
                id="recreo-printable-document"
                style={{
                    width: '100%',
                    maxWidth: '900px',
                    background: '#ffffff',
                    color: '#111827',
                    padding: '36px 40px',
                    borderRadius: '8px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    fontFamily: 'Arial, sans-serif',
                }}
            >
                {/* Style override for clean paper printing */}
                <style>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .no-print {
                            display: none !important;
                        }
                        #recreo-printable-document, #recreo-printable-document * {
                            visibility: visible;
                        }
                        #recreo-printable-document {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            max-width: 100%;
                            box-shadow: none !important;
                            padding: 10mm 15mm !important;
                            margin: 0 !important;
                        }
                    }
                `}</style>

                {/* ======================================================== */}
                {/* TABLE 1: PRIMER RECREO                                   */}
                {/* ======================================================== */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <h2 style={{
                        margin: '0 0 4px 0',
                        fontSize: '1.4rem',
                        fontWeight: 900,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: '#111827',
                    }}>
                        {monthName} {year}
                    </h2>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        color: '#374151',
                    }}>
                        GUARDIAS – PRIMER RECREO
                    </h3>
                </div>

                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'center',
                    marginBottom: '40px',
                    fontSize: '0.85rem',
                    border: '1.5px solid #d1d5db',
                }}>
                    <thead>
                        <tr>
                            <th style={{
                                width: '22%',
                                background: '#fca5a5', // Coral/Pink top header like in photo
                                color: '#7f1d1d',
                                padding: '10px 8px',
                                fontWeight: 800,
                                border: '1px solid #d1d5db',
                                textTransform: 'uppercase',
                                fontSize: '0.8rem',
                            }}>
                                ZONA
                            </th>
                            {DAYS_OF_WEEK.map(day => (
                                <th
                                    key={day}
                                    style={{
                                        background: '#fca5a5',
                                        color: '#7f1d1d',
                                        padding: '10px 8px',
                                        fontWeight: 800,
                                        border: '1px solid #d1d5db',
                                        textTransform: 'uppercase',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {RECREO_ZONES.map((zone, idx) => (
                            <tr key={zone.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                                <td style={{
                                    padding: '10px 8px',
                                    fontWeight: 800,
                                    border: '1px solid #d1d5db',
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    textTransform: 'uppercase',
                                    fontSize: '0.78rem',
                                    textAlign: 'center',
                                }}>
                                    {zone.name}
                                </td>
                                {DAYS_OF_WEEK.map(day => (
                                    <td
                                        key={day}
                                        style={{
                                            padding: '10px 8px',
                                            border: '1px solid #d1d5db',
                                            color: '#111827',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                        }}
                                    >
                                        {formatShortTeacherName(grid1[`${zone.id}_${day}`] || '') || '—'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Divider Line */}
                <div style={{ borderTop: '2px dashed #9ca3af', margin: '30px 0' }} />

                {/* ======================================================== */}
                {/* TABLE 2: SEGUNDO RECREO                                  */}
                {/* ======================================================== */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <h2 style={{
                        margin: '0 0 4px 0',
                        fontSize: '1.4rem',
                        fontWeight: 900,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: '#111827',
                    }}>
                        {monthName} {year}
                    </h2>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        color: '#374151',
                    }}>
                        GUARDIAS – SEGUNDO RECREO
                    </h3>
                </div>

                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    border: '1.5px solid #d1d5db',
                }}>
                    <thead>
                        <tr>
                            <th style={{
                                width: '22%',
                                background: '#93c5fd', // Sky/Blue top header like in photo
                                color: '#1e3a8a',
                                padding: '10px 8px',
                                fontWeight: 800,
                                border: '1px solid #d1d5db',
                                textTransform: 'uppercase',
                                fontSize: '0.8rem',
                            }}>
                                ZONA
                            </th>
                            {DAYS_OF_WEEK.map(day => (
                                <th
                                    key={day}
                                    style={{
                                        background: '#93c5fd',
                                        color: '#1e3a8a',
                                        padding: '10px 8px',
                                        fontWeight: 800,
                                        border: '1px solid #d1d5db',
                                        textTransform: 'uppercase',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {RECREO_ZONES.map((zone, idx) => (
                            <tr key={zone.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                                <td style={{
                                    padding: '10px 8px',
                                    fontWeight: 800,
                                    border: '1px solid #d1d5db',
                                    background: '#dbeafe',
                                    color: '#1e40af',
                                    textTransform: 'uppercase',
                                    fontSize: '0.78rem',
                                    textAlign: 'center',
                                }}>
                                    {zone.name}
                                </td>
                                {DAYS_OF_WEEK.map(day => (
                                    <td
                                        key={day}
                                        style={{
                                            padding: '10px 8px',
                                            border: '1px solid #d1d5db',
                                            color: '#111827',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                        }}
                                    >
                                        {formatShortTeacherName(grid2[`${zone.id}_${day}`] || '') || '—'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer notes */}
                <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
                    IES Reyes Católicos · Distribución Mensual de Puestos de Vigilancia de Patio
                </div>
            </div>
        </div>
    );
};
