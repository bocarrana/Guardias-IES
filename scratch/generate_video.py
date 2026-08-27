import os
from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'promo_screenshots')
AUDIO_DIR = os.path.join(BASE_DIR, 'audio')
OUTPUT_FILE = os.path.join(BASE_DIR, 'video_promocional.mp4')

# Mapeo exacto de la pista de audio con la imagen correspondiente
scenes = [
    {'audio': '01_intro.mp3', 'image': '00_intro_caratula.png'},
    {'audio': '02_login.mp3', 'image': '01_login.png'},
    {'audio': '03_modo_demo.mp3', 'image': '02_login_modo_demo.png'},
    {'audio': '04_panel_principal.mp3', 'image': '03_panel_guardias.png'},
    {'audio': '05_proximas.mp3', 'image': '14_proximas_guardias.png'},
    {'audio': '06_pendientes.mp3', 'image': '15_guardias_pendientes.png'},
    {'audio': '07_nueva_guardia.mp3', 'image': '16_nueva_guardia_modal.png'},
    {'audio': '08_historial.mp3', 'image': '09_historial_guardias.png'},
    {'audio': '09_cuadrante.mp3', 'image': '28_grupos_cuadrante.png'},
    {'audio': '10_mis_guardias.mp3', 'image': '19_mis_guardias.png'},
    {'audio': '11_mi_horario.mp3', 'image': '11_mi_horario.png'},
    {'audio': '12_estadisticas_personales.mp3', 'image': '20_estadisticas_mis_grupos.png'},
    {'audio': '13_estadisticas_globales.mp3', 'image': '21_estadisticas_todos.png'},
    {'audio': '14_calendario.mp3', 'image': '22_calendario_mes.png'},
    {'audio': '15_profesorado.mp3', 'image': '06_profesorado.png'},
    {'audio': '16_libre_disposicion.mp3', 'image': '12_libre_disposicion.png'},
    {'audio': '17_aulas_libres.mp3', 'image': '07_aulas_libres.png'},
    {'audio': '18_plano.mp3', 'image': '08_plano.png'},
    {'audio': '19_admin.mp3', 'image': '24_admin_panel_completo.png'},
    {'audio': '20_cierre.mp3', 'image': '21_cierre_caratula.png'}
]

print("🎬 Iniciando generador de vídeo con MoviePy...")
clips = []

for scene in scenes:
    audio_path = os.path.join(AUDIO_DIR, scene['audio'])
    img_path = os.path.join(BASE_DIR, scene['image'])
    
    if not os.path.exists(audio_path) or not os.path.exists(img_path):
        print(f"⚠️ Falta archivo para {scene['audio']} o {scene['image']}. Saltando...")
        continue
        
    print(f"Procesando: {scene['image']} + {scene['audio']}")
    # Cargar audio para saber la duración exacta de la escena
    audioclip = AudioFileClip(audio_path)
    
    # Crear clip de imagen con la misma duración que el audio
    # Añadimos 0.2s de pausa al final de cada frase para que quede natural
    imgclip = ImageClip(img_path).set_duration(audioclip.duration + 0.2)
    imgclip = imgclip.set_audio(audioclip)
    
    clips.append(imgclip)

if clips:
    print("\n🎞️ Juntando todos los clips...")
    final_clip = concatenate_videoclips(clips, method="compose")
    
    print("💾 Exportando MP4 final (esto puede tardar unos minutos)...")
    final_clip.write_videofile(
        OUTPUT_FILE, 
        fps=24, 
        codec="libx264", 
        audio_codec="aac",
        threads=4,
        preset="ultrafast" # Para que se genere más rápido en local
    )
    print(f"\n✅ ¡VÍDEO COMPLETADO! Guardado en: {OUTPUT_FILE}")
else:
    print("❌ No se pudo crear ningún clip.")
