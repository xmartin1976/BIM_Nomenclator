document.addEventListener('DOMContentLoaded', function() {
    const addFieldBtn = document.getElementById('add-field');
    const generateBtn = document.getElementById('generate');
    const fieldsContainer = document.getElementById('fields-container');
    const nomenclaturesContainer = document.getElementById('nomenclatures');
    const loadFieldsBtn = document.getElementById('load-fields');

    if (addFieldBtn) {
        addFieldBtn.addEventListener('click', addField);
    }
    generateBtn.addEventListener('click', generateNomenclature);
    if (loadFieldsBtn) {
        loadFieldsBtn.addEventListener('click', loadFields);
    }

    // Carregar les dades de la base de dades quan la pàgina s'iniciï
    loadDatabaseEntries();

    // Funció per afegir un nou camp
    function addField() {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'field-container mb-3';
        fieldDiv.innerHTML = `
            <label for="field-name" class="form-label">Field Name</label>
            <input type="text" class="form-control field-name" required>
            <label for="field-values" class="form-label">Field Values</label>
            <select class="form-select field-values" required>
                <option value="" selected disabled>Select a value</option>
            </select>
            <button class="btn btn-secondary add-value mt-2">Add Value</button>
            <button class="btn btn-danger remove-field mt-2">Remove Field</button>
        `;
        fieldsContainer.appendChild(fieldDiv);

        const removeButton = fieldDiv.querySelector('.remove-field');
        if (removeButton) {
            removeButton.addEventListener('click', function() {
                fieldsContainer.removeChild(fieldDiv);
            });
        }

        const addValueButton = fieldDiv.querySelector('.add-value');
        if (addValueButton) {
            console.log('Adding event listener to Add Value button');
            addValueButton.addEventListener('click', function() {
                addValueToField(fieldDiv);
            });
        }
    }

    // Funció per afegir un valor a un camp
    function addValueToField(fieldDiv) {
        console.log('addValueToField called');
        console.log('fieldDiv:', fieldDiv);

        const select = fieldDiv.querySelector('.field-values');
        console.log('Select element before:', select.innerHTML);

        const newValue = prompt('Enter a new value:');
        console.log('Prompt result:', newValue);

        if (newValue && newValue.trim() !== '') {
            const option = document.createElement('option');
            option.value = newValue.trim();
            option.textContent = newValue.trim();
            select.appendChild(option);
            select.value = newValue.trim();
            console.log('New option added:', option);
            console.log('Select element after:', select.innerHTML);
        } else {
            console.log('No value entered or empty value');
        }
    }

    // Funció per generar la nomenclatura
    function generateNomenclature() {
        const fields = document.querySelectorAll('.field-container');
        const separator = document.getElementById('separator').value;
        const project = document.getElementById('project').value;
        const extension = document.getElementById('extension').value;
        const user = document.getElementById('user').value;
        let nomenclatures = [''];

        fields.forEach(field => {
            const fieldName = field.querySelector('.field-name').value;
            const selectedValue = field.querySelector('.field-values').value;

            if (fieldName && selectedValue) {
                nomenclatures = nomenclatures.map(n => `${n}${n ? separator : ''}${selectedValue}`);
            }
        });

        nomenclaturesContainer.innerHTML = '';
        nomenclatures.forEach(n => {
            const div = document.createElement('div');
            div.className = 'nomenclature-item';
            div.textContent = n;

            const saveButton = document.createElement('button');
            saveButton.textContent = 'Save Nomenclature';
            saveButton.className = 'btn btn-sm btn-outline-primary mb-2 save-btn';
            saveButton.addEventListener('click', () => {
                saveNomenclature(n, project, extension, user);
            });

            div.appendChild(saveButton);
            nomenclaturesContainer.appendChild(div);
        });
    }

    // Funció per guardar la nomenclatura
    function saveNomenclature(nomenclature, project, extension, user) {
        fetch('/save_nomenclature', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nomenclature: nomenclature,
                project: project,
                extension: extension,
                user: user
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert(data.message);
                loadDatabaseEntries(); // Actualitzar la taula després de desar la nomenclatura
            } else {
                alert('Failed to save nomenclature');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    // Funció per carregar els camps des d'un fitxer
    function loadFields() {
        const fileInput = document.getElementById('file-upload');
        if (!fileInput.files.length) {
            console.error('No file selected');
            alert('Please select a file first.');
            return;
        }

        const file = fileInput.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok.');
                }
                return response.json();
            })
            .then(data => {
                if (data.fields) {
                    console.log('Fields loaded:', data.fields);
                    populateFields(data.fields);
                } else {
                    console.error('Error loading fields:', data.error);
                    alert('Error loading fields: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                alert('An error occurred while loading fields.');
            });
        } else {
            console.error('No file selected');
            alert('No file selected');
        }
    }

    // Funció per omplir els camps carregats des d'un fitxer
    function populateFields(fields) {
        fieldsContainer.innerHTML = '';
        fields.forEach(field => {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'field-container mb-3';
            fieldDiv.innerHTML = `
                <label for="field-name" class="form-label">Field Name</label>
                <input type="text" class="form-control field-name" value="${field.name}" required>
                <label for="field-values" class="form-label">Field Values</label>
                <select class="form-select field-values" required>
                    <option value="" selected disabled>Select a value</option>
                    ${field.values.map(value => `<option value="${value}">${value}</option>`).join('')}
                </select>
                <button class="btn btn-secondary add-value mt-2">Add Value</button>
                <button class="btn btn-danger remove-field mt-2">Remove Field</button>
            `;
            fieldsContainer.appendChild(fieldDiv);

            const removeButton = fieldDiv.querySelector('.remove-field');
            if (removeButton) {
                removeButton.addEventListener('click', function() {
                    fieldsContainer.removeChild(fieldDiv);
                });
            }

            const addValueButton = fieldDiv.querySelector('.add-value');
            if (addValueButton) {
                console.log('Adding event listener to Add Value button in populated field');
                addValueButton.addEventListener('click', function() {
                    addValueToField(fieldDiv);
                });
            }
        });
    }

    // Funció per carregar les dades de la base de dades
    function loadDatabaseEntries() {
        fetch('/get_nomenclatures')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.querySelector('#nomenclature-table tbody');
            tableBody.innerHTML = ''; // Netejar la taula abans d'afegir noves dades
            data.forEach(entry => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${entry.id}</td>
                    <td>${entry.nomenclature}</td>
                    <td>${entry.project}</td>
                    <td>${entry.extension}</td>
                    <td>${entry.date}</td>
                    <td>${entry.time}</td>
                    <td>${entry.user}</td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(error => console.error('Error loading database entries:', error));
    }
});

function gettext(text) {
    // This is a placeholder for the actual gettext function (if needed)
    // Since we are keeping everything in English,
    // this function can just return the text as it is.
    return text;
}