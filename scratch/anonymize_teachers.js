import fs from 'fs';

const firstNamesMale = [
    'Juan', 'Carlos', 'Javier', 'David', 'Miguel', 'Tomás', 'Óscar', 'Pablo', 
    'Andrés', 'Jesús', 'Antonio', 'Jaime', 'Francisco', 'Gonzalo', 'René', 
    'Alejandro', 'Agustín', 'Víctor', 'Manuel', 'José', 'Luis', 'Ángel', 'Daniel', 
    'Fernando', 'Rafael', 'Pedro', 'Alberto', 'Ramón', 'Santiago'
];

const firstNamesFemale = [
    'Natalia', 'Laura', 'Pilar', 'Teresa', 'Marisa', 'Irene', 'Sandra', 'Anabel', 
    'Julia', 'Ana', 'Sara', 'María', 'Silvia', 'Inés', 'Eva', 'Virginia', 'Patricia', 
    'Adriana', 'Vanesa', 'Tatiana', 'Diana', 'Marina', 'Rosana', 'Beatriz', 'Miriam', 
    'Carolina', 'Conchi', 'Esther', 'Idoia', 'Begoña', 'Elena', 'Carmen', 'Isabel', 
    'Lucía', 'Marta', 'Cristina'
];

const surnames = [
    'García', 'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sánchez', 
    'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 
    'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro', 'Torres', 
    'Domínguez', 'Ramos', 'Vázquez', 'Serrano', 'Blanco', 'Castro', 'Molina', 
    'Morales', 'Suárez', 'Ortiz', 'Delgado', 'Peña', 'Castillo', 'Ortega', 'Rubio'
];

function cleanString(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function generateName(id, currentName) {
    // Mantener la cuenta de desarrollador
    if (id === 'P001') {
        return { name: 'Admin de Pruebas', email: 'alplanast@educa.aragon.es' };
    }
    // Mantener el correo de pruebas específico solicitado por el usuario
    if (id === 'P088') {
        return { name: 'Jefe de Estudios (Demo)', email: 'usuariodemo@educa.aragon.es' };
    }
    
    // Determinar género probable por el nombre actual para mantener coherencia si se desea,
    // o simplemente usar generador aleatorio.
    const isFemale = currentName.toLowerCase().startsWith('laura') || 
                     currentName.toLowerCase().startsWith('maria') || 
                     currentName.toLowerCase().startsWith('mª') || 
                     currentName.toLowerCase().startsWith('natalia') || 
                     currentName.toLowerCase().startsWith('teresa') || 
                     currentName.toLowerCase().startsWith('marisa') || 
                     currentName.toLowerCase().startsWith('irene') || 
                     currentName.toLowerCase().startsWith('sandra') || 
                     currentName.toLowerCase().startsWith('anabel') || 
                     currentName.toLowerCase().startsWith('julia') || 
                     currentName.toLowerCase().startsWith('ana') || 
                     currentName.toLowerCase().startsWith('sara') || 
                     currentName.toLowerCase().startsWith('silvia') || 
                     currentName.toLowerCase().startsWith('inés') || 
                     currentName.toLowerCase().startsWith('eva') || 
                     currentName.toLowerCase().startsWith('virginia') || 
                     currentName.toLowerCase().startsWith('patricia') || 
                     currentName.toLowerCase().startsWith('adriana') || 
                     currentName.toLowerCase().startsWith('vanesa') || 
                     currentName.toLowerCase().startsWith('tatiana') || 
                     currentName.toLowerCase().startsWith('diana') || 
                     currentName.toLowerCase().startsWith('marina') || 
                     currentName.toLowerCase().startsWith('rosana') || 
                     currentName.toLowerCase().startsWith('beatriz') || 
                     currentName.toLowerCase().startsWith('miriam') || 
                     currentName.toLowerCase().startsWith('carolina') || 
                     currentName.toLowerCase().startsWith('conchi') || 
                     currentName.toLowerCase().startsWith('esther') || 
                     currentName.toLowerCase().startsWith('idoia') || 
                     currentName.toLowerCase().startsWith('begoña');

    const firstNames = isFemale ? firstNamesFemale : firstNamesMale;
    
    // Usar el número secuencial del ID directamente como índice para evitar colisiones
    const index = parseInt(id.replace(/\D/g, ''), 10) || 0;
    
    const firstName = firstNames[index % firstNames.length];
    const surname1 = surnames[(index * 7) % surnames.length];
    const surname2 = surnames[(index * 13) % surnames.length];
    
    const fullName = `${firstName} ${surname1} ${surname2}`;
    
    // Generar email limpio
    const cleanFirst = cleanString(firstName);
    const cleanSur = cleanString(surname1);
    const initialSur2 = cleanString(surname2).charAt(0);
    const idNum = id.replace(/\D/g, '');
    const email = `${cleanFirst}.${cleanSur}${initialSur2}${idNum}@educa.aragon.es`;
    
    return { name: fullName, email };
}

function processSql() {
    const filePath = 'schema_completo.sql';
    const content = fs.readFileSync(filePath, 'utf8');
    
    const regex = /INSERT INTO "Profesores" \((.*?)\) VALUES \('(P\d+)', '(.*?)', '(.*?)', (.*?)\);/g;
    
    const newContent = content.replace(regex, (match, cols, id, name, email, rest) => {
        const replacement = generateName(id, name);
        console.log(`Anonymized ${id}: "${name}" -> "${replacement.name}" (${replacement.email})`);
        return `INSERT INTO "Profesores" (${cols}) VALUES ('${id}', '${replacement.name}', '${replacement.email}', ${rest});`;
    });
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("SQL file anonymized successfully!");
}

processSql();
