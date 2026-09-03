import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm

pdf_path = r"c:\Users\esalb\Desktop\Guardias App\guardias-ies-aragon\GUIA_DESPLIEGUE_NUEVOS_CENTROS.pdf"

doc = SimpleDocTemplate(
    pdf_path,
    pagesize=A4,
    leftMargin=14*mm,
    rightMargin=14*mm,
    topMargin=14*mm,
    bottomMargin=14*mm
)

styles = getSampleStyleSheet()

# Custom styles
primary_color = colors.HexColor("#0284c7")
dark_blue = colors.HexColor("#0f172a")
text_dark = colors.HexColor("#1e293b")
text_muted = colors.HexColor("#64748b")
bg_code = colors.HexColor("#0f172a")
bg_highlight = colors.HexColor("#f0fdf4")
border_green = colors.HexColor("#86efac")

title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=22,
    textColor=dark_blue,
    spaceAfter=4
)

subtitle_style = ParagraphStyle(
    'DocSubTitle',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9.5,
    leading=13,
    textColor=text_muted,
    spaceAfter=12
)

h2_style = ParagraphStyle(
    'StepHeading',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=11.5,
    leading=15,
    textColor=dark_blue,
    spaceBefore=8,
    spaceAfter=4
)

body_style = ParagraphStyle(
    'BodyDark',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9.5,
    leading=13.5,
    textColor=text_dark,
    spaceAfter=4
)

bullet_style = ParagraphStyle(
    'BulletItem',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=13,
    textColor=text_dark,
    leftIndent=12,
    spaceAfter=3
)

code_style = ParagraphStyle(
    'CodeSnippet',
    parent=styles['Normal'],
    fontName='Courier',
    fontSize=8,
    leading=10.5,
    textColor=colors.white,
    backColor=bg_code,
    borderPadding=(5, 8, 5, 8),
    spaceBefore=4,
    spaceAfter=6
)

box_style = ParagraphStyle(
    'HighlightBox',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=12,
    textColor=colors.HexColor("#166534"),
    backColor=bg_highlight,
    borderColor=border_green,
    borderWidth=1,
    borderPadding=(6, 8, 6, 8),
    spaceBefore=4,
    spaceAfter=6
)

story = []

# Title & Subtitle
story.append(Paragraph("🏫 Guía Maestra de Despliegue para Nuevos IES", title_style))
story.append(Paragraph("Procedimiento oficial y estandarizado para institutos de Aragón · Tiempo total: ~8 minutos", subtitle_style))
story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=10))

# Summary Table
table_data = [
    [Paragraph("<b>Paso</b>", body_style), Paragraph("<b>Plataforma</b>", body_style), Paragraph("<b>Tiempo</b>", body_style), Paragraph("<b>Acción Principal</b>", body_style)],
    [Paragraph("<b>1</b>", body_style), Paragraph("Supabase", body_style), Paragraph("2 min", body_style), Paragraph("Crear nuevo proyecto para el instituto", body_style)],
    [Paragraph("<b>2</b>", body_style), Paragraph("Supabase SQL", body_style), Paragraph("1 min", body_style), Paragraph("Ejecutar <code>schema_completo.sql</code> y crear Admin inicial", body_style)],
    [Paragraph("<b>3</b>", body_style), Paragraph("Google & Supabase", body_style), Paragraph("2 min", body_style), Paragraph("Añadir Callback URL a Google OAuth y activar proveedor", body_style)],
    [Paragraph("<b>4</b>", body_style), Paragraph("Proyecto Local", body_style), Paragraph("1 min", body_style), Paragraph("Colocar <code>logo.png</code> y claves en <code>.env</code>", body_style)],
    [Paragraph("<b>5</b>", body_style), Paragraph("Vercel", body_style), Paragraph("2 min", body_style), Paragraph("Importar repo, configurar Root Directory y desplegar", body_style)],
]

t = Table(table_data, colWidths=[15*mm, 35*mm, 18*mm, 114*mm])
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
    ('TEXTCOLOR', (0, 0), (-1, 0), dark_blue),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))
story.append(t)
story.append(Spacer(1, 10))

# Step 1
story.append(Paragraph("1️⃣ Crear el Proyecto en Supabase (2 min)", h2_style))
story.append(Paragraph("1. Entra en tu panel de <b>Supabase</b> (<code>supabase.com/dashboard</code>) y haz clic en <b>'New Project'</b>.", bullet_style))
story.append(Paragraph("2. <b>Name:</b> <code>IES [Nombre]</code> (ej: <i>IES Ramón y Cajal</i>).", bullet_style))
story.append(Paragraph("3. <b>Database Password:</b> Genera o escribe una contraseña segura y anótala.", bullet_style))
story.append(Paragraph("4. <b>Region:</b> Selecciona <code>Frankfurt (eu-central-1)</code> o <code>London (eu-west-2)</code>.", bullet_style))
story.append(Paragraph("5. Pulsa en <b>'Create new project'</b> y espera ~1 minuto.", bullet_style))
story.append(Spacer(1, 6))

# Step 2
story.append(Paragraph("2️⃣ Inicializar la Base de Datos con Tablas y Calendario 2026-2027 (1 min)", h2_style))
story.append(Paragraph("1. En el menú izquierdo del nuevo proyecto, haz clic en <b>'SQL Editor'</b> (&gt;_).", bullet_style))
story.append(Paragraph("2. Pulsa en <b>'New query'</b>, pega todo el contenido de <code>_plantilla_base/schema_completo.sql</code> y pulsa <b>'Run'</b>.", bullet_style))
story.append(Paragraph("✨ <b>Automático:</b> Este script crea todas las tablas, activa la seguridad RLS y precarga los 303 días del <b>Calendario Escolar Oficial Aragón 2026-2027</b>.", box_style))
story.append(Paragraph("3. En una nueva consulta SQL, inserta la cuenta de Jefatura de Estudios:", bullet_style))
sql_code = """INSERT INTO public."Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia, activo)
VALUES ('P001', 'Jefatura de Estudios', 'guardias@ies[dominio].es', 'EQUIPO DIRECTIVO', 'Admin', 1, true);"""
story.append(Paragraph(sql_code.replace("\n", "<br/>"), code_style))
story.append(Spacer(1, 6))

# Step 3
story.append(Paragraph("3️⃣ Configurar Autenticación con Google OAuth (2 min)", h2_style))
story.append(Paragraph("1. <b>En Supabase:</b> Ve a <i>Authentication &rarr; Providers &rarr; Google</i>. Activa <b>'Enable Google provider'</b>, pega el <code>Client ID</code> y <code>Client Secret</code> (los mismos que ya tenemos en Google Cloud), y copia la <b>Callback URL</b> (ej: <code>https://xyz.supabase.co/auth/v1/callback</code>). Pulsa <b>Save</b>.", bullet_style))
story.append(Paragraph("2. <b>En Google Cloud Console:</b> Entra en <i>APIs &rarr; Credenciales</i>, abre el cliente OAuth <b>'Guardias IES'</b>, en <i>URIs de redireccionamiento autorizados</i> pulsa <b>+ Añadir URI</b>, pega la Callback URL copiada de Supabase y pulsa <b>Guardar</b>.", bullet_style))
story.append(Paragraph("3. <b>En Supabase (URL Configuration):</b> Ve a <i>Authentication &rarr; URL Configuration</i>. Pon <b>Site URL:</b> <code>https://guardias-[centro].vercel.app</code> y en <b>Redirect URLs:</b> añade <code>https://guardias-[centro].vercel.app/**</code> y <code>http://localhost:5173/**</code>. Pulsa <b>Save</b>.", bullet_style))
story.append(Spacer(1, 6))

# Step 4
story.append(Paragraph("4️⃣ Configurar la Carpeta Local del Centro (1 min)", h2_style))
story.append(Paragraph("1. En tu carpeta local, busca la carpeta del instituto (ej: <code>ies_ramon_y_cajal/</code>).", bullet_style))
story.append(Paragraph("2. Pega el logo del instituto en <code>ies_[centro]/public/logo.png</code>.", bullet_style))
story.append(Paragraph("3. Crea o edita los archivos <code>.env</code> y <code>.env.local</code> en esa carpeta con las claves de Supabase:", bullet_style))
env_code = """VITE_SUPABASE_URL=https://[tu-id-proyecto].supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_[clave-anon-de-supabase]"""
story.append(Paragraph(env_code.replace("\n", "<br/>"), code_style))
story.append(Paragraph("4. Guarda y sube a GitHub: <code>git add . && git commit -m 'Configurado nuevo centro' && git push origin main</code>", bullet_style))
story.append(Spacer(1, 6))

# Step 5
story.append(Paragraph("5️⃣ Desplegar en Vercel (2 min)", h2_style))
story.append(Paragraph("1. Entra en <b>Vercel</b> (<code>vercel.com/dashboard</code>) &rarr; <b>'Add New...' &rarr; 'Project'</b>.", bullet_style))
story.append(Paragraph("2. Selecciona el repositorio <code>bocarrana/Guardias-IES</code>.", bullet_style))
story.append(Paragraph("3. <b>Project Name:</b> <code>guardias-[centro]</code> (ej: <i>guardias-ramon-y-cajal</i>).", bullet_style))
story.append(Paragraph("4. <b>Root Directory:</b> Haz clic en <b>Edit</b> y selecciona la carpeta <code>ies_[centro]</code>.", bullet_style))
story.append(Paragraph("5. <b>Environment Variables:</b> Añade <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.", bullet_style))
story.append(Paragraph("6. Haz clic en <b>'Deploy'</b>. ¡En 40 segundos estará operativo!", bullet_style))
story.append(Spacer(1, 10))

# Footer note
story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0"), spaceAfter=6))
story.append(Paragraph("<font size='7.5' color='#94a3b8'>Guardias IES Aragón · Documento técnico de despliegue · Generado para Alberto Planas</font>", ParagraphStyle('Foot', alignment=1)))

doc.build(story)
print("✔ PDF generado con éxito en:", pdf_path)
