import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'promo_screenshots');
const BASE_URL = 'https://guardias-ies-aragon.vercel.app';

async function capture(page, filename, label) {
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
    console.log(`✅ ${filename} — ${label}`);
}

async function main() {
    console.log('🚀 Capturando vistas avanzadas...\n');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
        // ── LOGIN & ENTER ──────────────────────────────────────────────
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        await page.click('text=Acceder en Modo Demostración');
        await page.waitForSelector('select', { timeout: 6000 });

        // Seleccionar Admin/Jefatura
        const options = await page.$$('select option');
        for (const opt of options) {
            const text = await opt.textContent();
            if (text && (text.includes('Admin') || text.includes('Jefatura'))) {
                await page.selectOption('select', await opt.getAttribute('value'));
                break;
            }
        }
        await page.click('button:has-text("Entrar como")');
        await page.waitForTimeout(3500);

        // ── 17. DETALLE DE GUARDIA (abrir una tarjeta del historial) ────
        await page.click('text=Historial');
        await page.waitForTimeout(2000);
        const guardCards = await page.$$('.card, [class*="card"]');
        // click en una guardia del listado
        const firstGuardButton = await page.$('button:has-text("Ver detalle"), button[title*="detalle"], [data-testid*="guard"]');
        if (!firstGuardButton) {
            // Intentar clic en la primera tarjeta de guardia visible
            const allRows = await page.$$('[style*="border-left"]');
            if (allRows.length > 0) {
                await allRows[0].click();
                await page.waitForTimeout(1500);
                await capture(page, '17_detalle_guardia.png', 'Detalle de una Guardia');
                await page.keyboard.press('Escape');
            }
        }

        // ── 18. PERFIL DE PROFESOR (click en un profesor del directorio) ──
        await page.click('text=Profesorado');
        await page.waitForTimeout(2500);
        // Clic en la primera tarjeta de profesor para abrir su perfil
        const teacherCards = await page.$$('[style*="cursor: pointer"], [style*="cursor:pointer"]');
        if (teacherCards.length > 0) {
            await teacherCards[0].click();
            await page.waitForTimeout(1500);
            await capture(page, '18_perfil_profesor.png', 'Perfil de Profesor');
            await page.keyboard.press('Escape');
        } else {
            await capture(page, '18_profesorado_listado.png', 'Directorio de Profesorado');
        }

        // ── 19. MIS GUARDIAS (pestaña personal) ────────────────────────
        await page.click('text=Panel de Guardias');
        await page.waitForTimeout(2000);
        try {
            await page.click('text=Mis Guardias');
            await page.waitForTimeout(1800);
            await capture(page, '19_mis_guardias.png', 'Mis Guardias personales');
        } catch { console.log('⚠️  Tab Mis Guardias no encontrado'); }

        // ── 20. ESTADÍSTICAS - Vista "Mis Grupos" con filtros ──────────
        await page.click('text=Estadísticas');
        await page.waitForTimeout(2500);
        // Asegurarse de que estamos en Mis Grupos
        try {
            await page.click('text=Mis Grupos');
            await page.waitForTimeout(2000);
            await capture(page, '20_estadisticas_mis_grupos.png', 'Estadísticas personales Mis Grupos');
        } catch { console.log('⚠️  Botón Mis Grupos no encontrado'); }

        // ── 21. ESTADÍSTICAS - Vista "Todos los Grupos" ─────────────────
        try {
            await page.click('text=Todos los Grupos');
            await page.waitForTimeout(2000);
            await capture(page, '21_estadisticas_todos.png', 'Estadísticas globales Todos los Grupos');
        } catch { console.log('⚠️  Botón Todos los Grupos no encontrado'); }

        // ── 22. CALENDARIO con día marcado/evento ───────────────────────
        await page.click('text=Calendario');
        await page.waitForTimeout(2500);
        // Clic en un día del calendario para ver el popup de detalle
        const calDays = await page.$$('[style*="cursor: pointer"]');
        for (const d of calDays) {
            const txt = (await d.textContent()) || '';
            if (txt.trim().length <= 2 && parseInt(txt.trim()) > 0) {
                await d.click();
                await page.waitForTimeout(1200);
                break;
            }
        }
        await capture(page, '22_calendario_dia_detalle.png', 'Detalle de día en Calendario');

        // ── 23. MODO OSCURO (cambiar tema) ──────────────────────────────
        // Buscar el botón de cambio de tema
        try {
            const themeBtn = await page.$('[aria-label*="tema"], [aria-label*="theme"], button[title*="tema"]');
            if (themeBtn) {
                await themeBtn.click();
                await page.waitForTimeout(1500);
                await capture(page, '23_modo_claro.png', 'Interfaz en Modo Claro');
                await themeBtn.click(); // Volver a oscuro
                await page.waitForTimeout(800);
            } else {
                // Buscar el toggle de tema en la barra superior
                const toggles = await page.$$('button');
                for (const btn of toggles) {
                    const html = await btn.innerHTML();
                    if (html.includes('sun') || html.includes('moon') || html.includes('Sol') || html.includes('Luna')) {
                        await btn.click();
                        await page.waitForTimeout(1500);
                        await capture(page, '23_modo_claro.png', 'Interfaz en Modo Claro');
                        await btn.click();
                        await page.waitForTimeout(800);
                        break;
                    }
                }
            }
        } catch { console.log('⚠️  Toggle de tema no encontrado'); }

        // ── 24. PANEL ADMINISTRADOR - Pestaña de Configuración ───────────
        await page.click('text=Administrador');
        await page.waitForTimeout(2500);
        await capture(page, '24_admin_inicio.png', 'Panel Administrador vista inicial');

        // Intentar clicar en alguna sub-pestaña del admin
        try {
            const adminTabs = await page.$$('[role="tab"], button[class*="tab"]');
            if (adminTabs.length > 1) {
                await adminTabs[1].click();
                await page.waitForTimeout(1500);
                await capture(page, '25_admin_configuracion.png', 'Admin - Subpestaña de configuración');
            }
        } catch { console.log('⚠️  Sub-pestañas de admin no encontradas'); }

        // ── 25. LIBRE DISPOSICIÓN con un registro expandido ─────────────
        await page.click('text=Libre Disposición');
        await page.waitForTimeout(2500);
        await capture(page, '26_libre_disposicion_detalle.png', 'Libre Disposición con registros');

        // ── 26. AULAS LIBRES con un aula seleccionada ───────────────────
        await page.click('text=Aulas Libres');
        await page.waitForTimeout(2500);
        // Clic en una franja horaria
        const slots = await page.$$('button:has-text("h"), button[class*="slot"]');
        if (slots.length > 0) {
            await slots[0].click();
            await page.waitForTimeout(1200);
        }
        await capture(page, '27_aulas_libres_detalle.png', 'Aulas Libres con franja seleccionada');

        console.log('\n🎉 ¡Capturas avanzadas completadas! Guardadas en:', SCREENSHOTS_DIR);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await browser.close();
    }
}

main();
