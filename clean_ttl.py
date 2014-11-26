def clean_ttl(read_path, write_path):
	with open(read_path, 'rb') as p, open(write_path, 'wb') as c:
		p.next()
		for line in p:
			l = line.split()
			source = l[0][29:-1]
			target = l[2][29:-1]
			c.write(source + '\t' + target + '\n')

if __name__ == '__main__':
	print "Cleaning page links..."
	clean_ttl('data/page_links_en.ttl', 'data/cleaned_links.tsv')
	print "Cleaning redirects..."
	clean_ttl('data/redirects_en.ttl', 'data/cleaned_redirects.tsv')
	print "Done!"