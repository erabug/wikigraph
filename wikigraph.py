from flask import Flask, render_template, request
import cPickle as pickle
import query

app = Flask(__name__)
app.secret_key = 'lisaneedsbraces'

NODE_CODES = pickle.load(open('nodes.p', 'rb'))

@app.route('/')
def index():

	return render_template('index.html')

@app.route('/query')
def get_path():

	n1_name = request.args.get('node1')
	n2_name = request.args.get('node2')

	node1 = str(NODE_CODES[n1_name])
	node2 = str(NODE_CODES[n2_name])

	response = query.create_lists(node1, node2)

	return response # string

if __name__ == '__main__':
	app.run(debug=True)
	# app.run(host="54", debug=True)