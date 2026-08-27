import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'promo_screenshots');
const BASE_URL = 'https://guardias-ies-aragon.vercel.app';

async function capture(page, filename, label) {
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
    console.log(`✅ Captura guardada: ${filename} (${label})`);
}

async function main() {
    console.log('🚀 Iniciando capturas adicionales de Guardias IES Aragón...\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    try {
        // Ir a la app y entrar en modo demo como Admin
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        await page.click('text=Acceder en Modo Demostración');
        await page.waitForSelector('select', { timeout: 6000 });

        // Seleccionar usuario Admin/Jefatura
        const options = await page.$$('select option');
        for (const opt of options) {
            const text = await opt.textContent();
            if (text && (text.includes('Admin') || text.includes('Jefatura') || text.includes('Director'))) {
                const val = await opt.getAttribute('value');
                await page.selectOption('select', val);
                break;
            }
        }
        await page.click('button:has-text("Entrar como")');
        await page.waitForTimeout(3000);

        // 10. Grupos de Guardias
        await page.click('text=Grupos Guardias');
        await page.waitForTimeout(2500);
        await capture(page, '10_grupos_guardias.png', 'Grupos de Guardias por Franja');

        // 11. Mi Horario
        await page.click('text=Mi Horario');
        await page.waitForTimeout(2500);
        await capture(page, '11_mi_horario.png', 'Horario Personal del Profesor');

        // 12. Libre Disposición
        await page.click('text=Libre Disposición');
        await page.waitForTimeout(2500);
        await capture(page, '12_libre_disposicion.png', 'Panel de Libre Disposición');

        // 13. Panel Administrador
        await page.click('text=Administrador');
        await page.waitForTimeout(2500);
        await capture(page, '13_panel_administrador.png', 'Panel de Administrador');

        // 14. Panel principal con filtro Próximas (pestaña)
        await page.click('text=Panel de Guardias');
        await page.waitForTimeout(2000);
        try {
            await page.click('text=Próximas');
            await page.waitForTimeout(1500);
            await capture(page, '14_proximas_guardias.png', 'Vista Próximas Guardias');
        } catch {
            console.log('⚠️  Pestaña Próximas no encontrada, omitiendo.');
        }

        // 15. Panel principal con filtro Pendientes (pestaña)
        try {
            await page.click('text=Pendientes');
            await page.waitForTimeout(1500);
            await capture(page, '15_guardias_pendientes.png', 'Vista Guardias Pendientes');
        } catch {
            console.log('⚠️  Pestaña Pendientes no encontrada, omitiendo.');
        }

        // 16. Nueva guardia modal abierto
        try {
            await page.click('text=NUEVA GUARDIA');
            await page.waitForTimeout(1500);
            await capture(page, '16_nueva_guardia_modal.png', 'Modal Nueva Guardia');
            // Cerrar el modal
            await page.keyboard.press('Escape');
        } catch {
            console.log('⚠️  Modal de Nueva Guardia no encontrado, omitiendo.');
        }

        console.log('\n🎉 ¡Capturas adicionales completadas! Guardadas en:', SCREENSHOTS_DIR);

    } catch (err) {
        console.error('❌ Error durante la captura:', err.message);
    } finally {
        await browser.close();
    }
}

main();
