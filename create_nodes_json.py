with open('nodes.csv', 'rb') as n, open('nodes.json', 'wb') as j:
	n.next()
	j.write('[')
	for line in n:
		l = line.split('\t')
		j.write('"'+l[1].replace('_', ' ').replace('\\', '')+'",')
	j.write(']')