import io
import sqlite3
from datetime import datetime
from flask import Flask, render_template, request, jsonify, make_response
from flask_babel import Babel, gettext
import os
import logging
from werkzeug.utils import secure_filename
import openpyxl
from openpyxl.utils import get_column_letter
import csv

app = Flask(__name__)
babel = Babel(app)

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Initialize the database
def init_db():
    conn = sqlite3.connect('nomenclature.db')
    cur = conn.cursor()
    cur.execute('''CREATE TABLE IF NOT EXISTS nomenclatures (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nomenclature TEXT,
                    project TEXT,
                    extension TEXT,
                    date TEXT,
                    time TEXT,
                    user TEXT)''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    return render_template('index.html')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload', methods=['POST'])
def upload_file():
    logging.debug("Upload file request received")
    if 'file' not in request.files:
        logging.error("No file part in the request")
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        logging.error("No selected file")
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        logging.info(f"File saved: {file_path}")

        try:
            fields = parse_csv(file_path)
            logging.info(f"CSV parsed successfully: {fields}")
            return jsonify({'fields': fields}), 200
        except Exception as e:
            logging.error(f"Error parsing CSV: {str(e)}")
            return jsonify({'error': 'Failed to parse CSV file'}), 500
    logging.error("Invalid file type")
    return jsonify({'error': 'Invalid file type'}), 400

def parse_csv(file_path):
    logging.info(f"Starting to parse CSV file: {file_path}")
    fields = []
    current_field = None
    with open(file_path, 'r') as csvfile:
        reader = csv.reader(csvfile)
        for row_index, row in enumerate(reader, start=1):
            logging.debug(f"Processing row {row_index}: {row}")
            if row and row[0].startswith('**') and row[0].endswith('**'):
                field_name = row[0].strip('**').strip()
                logging.info(f"Found new field: {field_name}")
                if current_field:
                    logging.debug(f"Appending previous field: {current_field}")
                    fields.append(current_field)
                current_field = {'name': field_name, 'values': []}
            elif current_field:
                values = [value.strip() for value in row if value.strip()]
                logging.debug(f"Adding values to current field: {values}")
                current_field['values'].extend(values)
            else:
                logging.warning(f"Skipping row {row_index}: No current field defined")

    if current_field:
        logging.debug(f"Appending last field: {current_field}")
        fields.append(current_field)

    logging.info(f"Finished parsing CSV. Total fields found: {len(fields)}")
    logging.info(f"Final parsed fields: {fields}")
    return fields

@app.route('/save_nomenclature', methods=['POST'])
def save_nomenclature():
    data = request.json
    nomenclature = data.get('nomenclature')
    project = data.get('project')
    extension = data.get('extension')
    user = data.get('user')
    date = datetime.now().strftime('%Y-%m-%d')
    time = datetime.now().strftime('%H:%M:%S')

    conn = sqlite3.connect('nomenclature.db')
    cur = conn.cursor()
    cur.execute('INSERT INTO nomenclatures (nomenclature, project, extension, date, time, user) VALUES (?, ?, ?, ?, ?, ?)',
                (nomenclature, project, extension, date, time, user))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': 'Nomenclature saved successfully'})

@app.route('/export')
def export_data():
    conn = sqlite3.connect('nomenclature.db')
    cur = conn.cursor()
    cur.execute('SELECT * FROM nomenclatures')
    rows = cur.fetchall()
    conn.close()

    # Create a workbook and select the active worksheet
    wb = openpyxl.Workbook()
    ws = wb.active

    # Add headers
    headers = ["id", "nomenclature", "project", "extension", "date", "time", "user"]
    ws.append(headers)

    # Add data rows
    for row in rows:
        ws.append(row)

    # Adjust column widths
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter # Get the column name
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(cell.value)
            except:
                pass
        adjusted_width = (max_length + 2)
        ws.column_dimensions[column].width = adjusted_width

    # Create the in-memory output file
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    # Create the HTTP response with the XLSX content
    response = make_response(output.getvalue())
    response.headers['Content-Disposition'] = 'attachment; filename=nomenclatures.xlsx'
    response.headers["Content-type"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return response

@app.route('/get_nomenclatures', methods=['GET'])
def get_nomenclatures():
    conn = sqlite3.connect('nomenclature.db')
    cur = conn.cursor()
    cur.execute('SELECT * FROM nomenclatures')
    rows = cur.fetchall()
    conn.close()

    # Transformar les dades a un format JSON-friendly
    nomenclatures = [
        {
            "id": row[0],
            "nomenclature": row[1],
            "project": row[2],
            "extension": row[3],
            "date": row[4],
            "time": row[5],
            "user": row[6]
        }
        for row in rows
    ]

    return jsonify(nomenclatures)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
    