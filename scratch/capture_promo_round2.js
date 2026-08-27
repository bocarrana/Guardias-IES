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

async function closeModals(page) {
    // Intentar cerrar cualquier modal abierto con Escape o botón de cierre
    try { await page.keyboard.press('Escape'); await page.waitForTimeout(500); } catch {}
    try {
        const closeBtn = await page.$('button[aria-label="Close"], button:has-text("×"), button:has-text("Cerrar")');
        if (closeBtn) { await closeBtn.click(); await page.waitForTimeout(500); }
    } catch {}
}

async function main() {
    console.log('🚀 Capturando vistas adicionales (2ª ronda)...\n');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    try {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        await page.click('text=Acceder en Modo Demostración');
        await page.waitForSelector('select', { timeout: 6000 });

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

        // ── 18. PROFESORADO (sin abrir perfil, solo el listado con tarjetas) ──
        await page.click('text=Profesorado');
        await page.waitForTimeout(2500);
        await capture(page, '18_profesorado_tarjetas.png', 'Directorio de Profesorado con tarjetas de avatar');

        // ── 19. MIS GUARDIAS ──────────────────────────────────────────
        await page.click('text=Panel de Guardias');
        await page.waitForTimeout(2000);
        try {
            await page.click('text=Mis Guardias');
            await page.waitForTimeout(2000);
            await capture(page, '19_mis_guardias.png', 'Vista Mis Guardias personal');
        } catch { console.log('⚠️  Tab Mis Guardias no encontrado'); }

        // ── 20. ESTADÍSTICAS - Mis Grupos ─────────────────────────────
        await page.click('text=Estadísticas');
        await page.waitForTimeout(2500);
        try {
            await page.click('text=Mis Grupos');
            await page.waitForTimeout(2000);
            await capture(page, '20_estadisticas_mis_grupos.png', 'Estadísticas personales Mis Grupos');
        } catch { console.log('⚠️  Botón Mis Grupos no encontrado'); }

        // ── 21. ESTADÍSTICAS - Todos los Grupos ───────────────────────
        try {
            await page.click('text=Todos los Grupos');
            await page.waitForTimeout(2000);
            await capture(page, '21_estadisticas_todos.png', 'Estadísticas globales del centro');
        } catch { console.log('⚠️  Botón Todos los Grupos no encontrado'); }

        // ── 22. CALENDARIO con día clicado ────────────────────────────
        await page.click('text=Calendario');
        await page.waitForTimeout(2500);
        await capture(page, '22_calendario_mes.png', 'Calendario escolar con visión mensual');

        // ── 23. MODO CLARO ────────────────────────────────────────────
        // Buscar switch de tema en header
        const allButtons = await page.$$('button');
        let themeToggled = false;
        for (const btn of allButtons) {
            try {
                const ariaLabel = await btn.getAttribute('aria-label') || '';
                const title = await btn.getAttribute('title') || '';
                if (ariaLabel.toLowerCase().includes('tema') || title.toLowerCase().includes('tema') ||
                    ariaLabel.toLowerCase().includes('light') || ariaLabel.toLowerCase().includes('dark')) {
                    await btn.click();
                    await page.waitForTimeout(1500);
                    await capture(page, '23_modo_claro.png', 'Interfaz en Modo Claro');
                    await btn.click(); // Volver a oscuro
                    themeToggled = true;
                    break;
                }
            } catch {}
        }
        if (!themeToggled) {
            // Intentar con el toggle de la barra superior directamente
            const svgs = await page.$$('svg');
            for (const svg of svgs) {
                const parent = await svg.$('..');
                if (parent) {
                    const tag = await parent.evaluate(el => el.tagName);
                    if (tag === 'BUTTON') {
                        const bounds = await parent.boundingBox();
                        // El toggle de tema suele estar en la esquina superior derecha
                        if (bounds && bounds.x > 700 && bounds.y < 80) {
                            await parent.click();
                            await page.waitForTimeout(1500);
                            await capture(page, '23_modo_claro.png', 'Interfaz en Modo Claro');
                            await parent.click();
                            break;
                        }
                    }
                }
            }
        }

        // ── 24. PANEL ADMINISTRADOR ──────────────────────────────────
        await page.click('text=Administrador');
        await page.waitForTimeout(2500);
        await capture(page, '24_admin_panel_completo.png', 'Panel de Administrador completo');

        // ── 25. LIBRE DISPOSICIÓN ─────────────────────────────────────
        await page.click('text=Libre Disposición');
        await page.waitForTimeout(2500);
        await capture(page, '26_libre_disposicion_vista.png', 'Gestión de Libre Disposición');

        // ── 26. AULAS LIBRES con detalle ──────────────────────────────
        await page.click('text=Aulas Libres');
        await page.waitForTimeout(2500);
        await capture(page, '27_aulas_libres_franjas.png', 'Aulas Libres con franjas horarias');

        // ── 27. GRUPOS GUARDIAS detalle ───────────────────────────────
        await page.click('text=Grupos Guardias');
        await page.waitForTimeout(2500);
        await capture(page, '28_grupos_cuadrante.png', 'Cuadrante de Grupos de Guardia');

        console.log('\n🎉 ¡Segunda ronda de capturas completada! Guardadas en:', SCREENSHOTS_DIR);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await browser.close();
    }
}

main();
