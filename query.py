from py2neo import neo4j
import json
import sys
import time

def find_shortest_path(node1, node2):
	"""Connects to graph database, then creates and sends query to graph 
	database. Returns the shortest path between two nodes.
	Format: (67149)-[:'LINKS_TO']->(421)"""

	graph_db = neo4j.GraphDatabaseService()

	t0 = time.time()
	query = neo4j.CypherQuery(
		graph_db, 
		"""MATCH (m {node:'%s'}), (n {node:'%s'}), 
		p = shortestPath((m)-[*..20]->(n)) RETURN p""" % (node1, node2)
		)

	path = query.execute_one()
	t1 = time.time()

	print "Shortest Path:", path
	print "Time elapsed: %.2f seconds." % (t1 - t0)

	return path

def parse_node(node, in_path):
	"""Extract name and id from a node object. Returns a dict of information."""

	n, name = node.get_properties().values()
	name = name.replace('_', ' ')

	node_dict = {'id': int(n), 'name': name, 'group': 'none'}

	label = node.get_labels() - set(['Page']) # does it have a label other than Page?
	if label:
		node_dict['type'] = list(label)[0]

	if in_path:
		node_dict['group'] = 'path'

	return node_dict

def parse_rel(rel, in_path):
	"""Extract node id from a relationship object. Returns a dict of 
	information."""

	start_id = rel.start_node.get_properties()['node']
	end_id = rel.end_node.get_properties()['node']

	rel_dict = {'source': int(start_id), 'target': int(end_id), 'value': 0}

	if in_path:
		rel_dict['value'] = 1

	return rel_dict

def parse_rel_objs(rel_objs_list, in_path=False):
	"""Takes a list of relationship objects. Returns list of rel dicts."""

	rel_dict_list = []

	for rel in rel_objs_list:

		rel_dict = parse_rel(rel=rel, in_path=in_path)
		rel_dict_list.append(rel_dict)

	return rel_dict_list

def parse_node_objs(node_objs_list, in_path=False):
	"""Takes a list of node objects. Returns list of node dicts."""

	node_dict_list = []

	for node in node_objs_list:
		node_dict = parse_node(node, in_path=in_path)
		node_dict_list.append(node_dict)

	return node_dict_list

def find_secondary_rels_and_nodes(node_objs_list):
	"""Takes a list of node objects. Returns list of rel dicts."""

	rels = []
	nodes = []

	for node in node_objs_list:

		for rel in node.match_incoming(limit=1):
			rels.append(rel)
			nodes.append(rel.start_node)

		for rel in node.match_outgoing(limit=1):
			rels.append(rel)
			nodes.append(rel.end_node)			

	rel_dict_list = parse_rel_objs(rels)
	node_dict_list = parse_node_objs(nodes)

	return rel_dict_list, node_dict_list

def parse_nods_and_rels(path):
	"""Takes a path object. Returns two lists, one for rel dicts and one for 
	node dicts."""

	# rel dict list for main path
	path_rels = parse_rel_objs(rel_objs_list=path.relationships, in_path=True)
	# print "path_rels:", path_rels

	# rel dict list for secondary rels
	non_path_rels, non_path_nodes = find_secondary_rels_and_nodes(node_objs_list=path.nodes)
	# print "non_path_rels", non_path_rels
	# print "non_path_nodes", non_path_nodes

	# combine the two lists
	rels_list = path_rels + non_path_rels
	print "rels_list:", rels_list

	# parse nodes, create list of unique nodes
	path_nodes = parse_node_objs(node_objs_list=path.nodes)
	# print "path_nodes:", path_nodes

	nodes_list = path_nodes + non_path_nodes
	print "nodes_list:", nodes_list

	return rels_list, nodes_list
		
# def create_rels_list(path):
# 	"""Given the returned path, create a dict for each relationship. Returns 
# 	list of dicts. 
# 	Format: [{'source': 42, 'target': 552}]"""

# 	rels_list = []

# 	for rel in path.relationships:
# 		start_node = rel.start_node.get_properties()['node']
# 		end_node = rel.end_node.get_properties()['node']
# 		rels_list.append({'source': int(start_node), 'target': int(end_node), 'value': 1})

# 	return rels_list

# def create_nodes_list(path):
# 	"""Given the returned path, create a dict for each node. Returns list of 
# 	dicts. 'Type' is included when available.
# 	Format: [{'node': 42, 'name': 'Douglas Adams', 'group': 'path'}]"""

# 	nodes_list = []

# 	for a_node in path.nodes:

# 		node, name = a_node.get_properties().values()
# 		name = name.replace('_', ' ')
# 		node = int(node)

# 		d = {'id': node, 'name': name, 'group': 'path'}

# 		labels = a_node.get_labels()
# 		label = labels - set(['Page']) # does it have a label other than Page?
# 		if label:
# 			d['type'] = list(label)[0]

# 		nodes_list.append(d)

# 	return nodes_list

def create_lists(node1, node2):
	"""Request the shortest path between two nodes from the database. Assemble 
	list of nodes and relationships from the path, then process	to recode their 
	IDs. Write output to a JSON file."""

	path = find_shortest_path(str(node1), str(node2))
	# rels_list = create_rels_list(path)
	# nodes_list = create_nodes_list(path)
	rels_list, nodes_list = parse_nods_and_rels(path)

	codes = {}
	id_counter = 0

	for node in nodes_list: # create a dict to translate id codes
		node_id = node['id']
		if node_id not in codes:
			codes[node_id] = id_counter
			id_counter += 1
		node['id'] = codes[node_id]

	print "codes:", codes

	for rel in rels_list: # look up the source and target in codes
		rel['source'] = codes[rel['source']]
		rel['target'] = codes[rel['target']]

	response = '{ "directed": true, "nodes":' + json.dumps(nodes_list) + ', "links":' + json.dumps(rels_list) + ', "multigraph": false }'
	# print "response", response
	# with open('static/response.json', 'wb') as w:
	# 	w.write(response)

	return response

if __name__ == '__main__':
	# f, node1, node2 = sys.argv
	# create_lists(node1, node2)
	path = find_shortest_path('1', '4')
	parse_nods_and_rels(path)

