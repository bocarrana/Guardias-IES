import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'promo_screenshots');
const BASE_URL = 'https://guardias-ies-aragon.vercel.app';

async function capture(page, filename, label) {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
    console.log(`✅ Captura guardada: ${filename} (${label})`);
}

async function main() {
    console.log('🚀 Iniciando capturas promocionales de Guardias IES Aragón...\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    try {
        // 1. Login Screen
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        await capture(page, '01_login.png', 'Pantalla de Login');

        // 2. Login Demo Mode expanded
        await page.click('text=Acceder en Modo Demostración');
        await page.waitForSelector('select', { timeout: 5000 });
        await capture(page, '02_login_modo_demo.png', 'Modo Demo expandido');

        // 3. Log in as first admin/jefatura teacher
        const options = await page.$$('select option');
        for (const opt of options) {
            const text = await opt.textContent();
            if (text && (text.includes('Admin') || text.includes('Jefatura') || text.includes('Director'))) {
                const val = await opt.getAttribute('value');
                await page.selectOption('select', val);
                break;
            }
        }
        // Click the Entrar button
        await page.click('button:has-text("Entrar como")');
        await page.waitForTimeout(3000);
        await capture(page, '03_panel_guardias.png', 'Panel Principal de Guardias');

        // 4. Estadísticas
        await page.click('text=Estadísticas');
        await page.waitForTimeout(3000);
        await capture(page, '04_estadisticas.png', 'Estadísticas y Gráficos');

        // 5. Calendario
        await page.click('text=Calendario');
        await page.waitForTimeout(2000);
        await capture(page, '05_calendario.png', 'Calendario Escolar');

        // 6. Profesorado
        await page.click('text=Profesorado');
        await page.waitForTimeout(2000);
        await capture(page, '06_profesorado.png', 'Lista de Profesorado');

        // 7. Aulas Libres
        await page.click('text=Aulas Libres');
        await page.waitForTimeout(2000);
        await capture(page, '07_aulas_libres.png', 'Aulas Libres');

        // 8. Plano del Centro
        await page.click('text=Plano');
        await page.waitForTimeout(2000);
        await capture(page, '08_plano.png', 'Plano del Centro');

        // 9. Historial (pestaña Historial en Panel Guardias)
        await page.click('text=Panel de Guardias');
        await page.waitForTimeout(2000);
        try {
            await page.click('text=Historial');
            await page.waitForTimeout(1500);
            await capture(page, '09_historial_guardias.png', 'Historial de Guardias');
        } catch {
            console.log('⚠️  Pestaña Historial no encontrada, omitiendo.');
        }

        console.log('\n🎉 ¡Capturas completadas! Guardadas en:', SCREENSHOTS_DIR);

    } catch (err) {
        console.error('❌ Error durante la captura:', err.message);
    } finally {
        await browser.close();
    }
}

main();
