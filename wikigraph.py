from flask import Flask, render_template, request, jsonify, g
import query
import sqlite3

app = Flask(__name__)
app.secret_key = 'lisaneedsbraces'

def connect():

    cursor = sqlite3.connect('data/nodes_pres.db').cursor()
    return cursor

@app.route('/')
def index():

	return render_template('index.html')

@app.route('/query')
def get_path():

	node1, node2 = request.args.values()
	response = query.create_lists(node1, node2)

	return response # string

@app.route('/page-names')
def get_page_names():

	entry = request.args.get("query")
	cursor = connect()
	query = '''SELECT id, title 
				FROM nodes 
				WHERE title LIKE ? 
				OR title LIKE ?
				LIMIT 50;'''

	rows = cursor.execute(query, (entry + '%', '% ' + entry, )).fetchall()
	results = [{ 'title': row[1], 'code': row[0] } for row in rows]
	response = jsonify(**{ 'results': results })
	print response

	return response

@app.route('/random')
def get_random_names():

	cursor = connect()
	query = 'SELECT id, title FROM nodes ORDER BY RANDOM() LIMIT 2'
	rows = cursor.execute(query).fetchall()
	results = [{ 'title': row[1], 'code': row[0] } for row in rows]
	response = jsonify(**{ 'results': results })

	return response

if __name__ == '__main__':
	app.run(debug=True)
	# app.run(host="54", debug=True)