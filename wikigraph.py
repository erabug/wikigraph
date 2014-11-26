from flask import Flask, render_template, request, jsonify, g
import query
import sqlite3
import random

app = Flask(__name__)
app.secret_key = 'lisaneedsbraces'

def connect():

    cursor = sqlite3.connect('data/nodes.db').cursor()
    return cursor

@app.route('/')
def index():

	return render_template('index.html')

@app.route('/query')
def get_path():

	print "requesting shortest path..."
	node1, node2 = request.args.values()
	response = query.create_lists(node1, node2)

	return response # string

@app.route('/page-names')
def get_page_names():

	print "requesting page names..."
	entry = request.args.get("query")
	cursor = connect()
	query = '''SELECT id, title 
				FROM nodes
				WHERE title LIKE ? 
				OR title LIKE ?
				LIMIT 100;'''

	rows = cursor.execute(query, (entry + '%', '% ' + entry, )).fetchall()
	results = [{ 'title': row[1], 'code': row[0] } for row in rows]
	response = jsonify(**{ 'results': results })
	print response, len(results)

	return response

@app.route('/random')
def get_random_names():

	print "starting random query..."
	node1 = str(random.randrange(11135648))
	node2 = str(random.randrange(11135648))

	cursor = connect()
	# query = 'SELECT id, title FROM nodes ORDER BY RANDOM() LIMIT 2'
	query = 'SELECT id, title FROM nodes WHERE id = ? OR id = ?'
	rows = cursor.execute(query, (node1, node2, )).fetchall()
	results = [{ 'title': row[1].replace('_', ' '), 'code': row[0] } for row in rows]
	print 'results:', results
	response = jsonify(**{ 'results': results })

	return response

if __name__ == '__main__':
	app.run(debug=True)
	# app.run(host="54", debug=True)