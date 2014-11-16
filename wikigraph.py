from flask import Flask, render_template, request, jsonify, g
import query
import sqlite3

app = Flask(__name__)
app.secret_key = 'lisaneedsbraces'

def connect():
    conn = sqlite3.connect('data/nodes_pres.db')
    cursor = conn.cursor()
    return cursor

@app.route('/')
def index():

	return render_template('index.html')

@app.route('/query')
def get_path():

	node1 = request.args.get('node1')
	node2 = request.args.get('node2')

	response = query.create_lists(node1, node2)

	return response # string

@app.route('/page-names')
def get_page_names():

	entry = request.args.get("query")

	cursor = connect()
	query = 'SELECT id, title FROM nodes WHERE title LIKE ?;'
	cursor.execute(query, ('% ' + entry + '%', ))
	rows = cursor.fetchall() # list of tuples

	results = []
	for row in rows:
		results.append({ 'title': row[1], 'code': row[0] })

	response = { 'results': results }

	return jsonify(**response)

if __name__ == '__main__':
	app.run(debug=True)
	# app.run(host="54", debug=True)