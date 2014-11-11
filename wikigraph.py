from flask import Flask, render_template, request
import query

app = Flask(__name__)

app.secret_key = 'lisaneedsbraces'

@app.route("/")
def index():

	return render_template("index.html")

@app.route("/query")
def get_path():

	node1 = request.args.get("node1")
	node2 = request.args.get("node2")

	response = query.create_lists(node1, node2)

	return response # string

if __name__ == "__main__":
	app.run(debug=True)