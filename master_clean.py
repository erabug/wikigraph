import os
import urllib2

def parse_url(url):
    path, name = os.path.split(urllib2.urlparse.urlparse(url).path)
    return name[:-1]

def redirects_set():

    print "Creating set of redirect pages..."
    redirects = set()

    with open('data/redirects_en.ttl', 'r') as r:
        for line in r:
            l = line.split()
            name = parse_url(l[0])
            redirects.add(name)

    return redirects # as a set

def parse_links():

    redirects = redirects_set() # create set of redirects

    print "reading page_links_en.ttl..."
    data = {}
    
    counter = 100000
    id_counter = 0

    lp = 'data/page_links_en.ttl'
    rp = 'data/rels.tsv'
    np = 'data/nodes.tsv'

    with open(lp, 'r') as p, open(rp, 'wb+') as rels, open(np, 'wb+') as nodes:

        rels.write('start\tend\ttype\n') # write headers
        nodes.write('node\tname\tl:label\tdegrees\n')
        p.next()

        for line in p:
            if counter > 0:

                l = line.split()
                start = parse_url(l[0])
                end = parse_url(l[2])
                if end[:5] == "File:" or start in redirects:
                    continue

                # STRUCTURE: data = {'page1': {'code': 41, 'links': ['page2', 'page3']}}
                if start not in data: # give it a counter
                    start_id = id_counter
                    id_counter += 1

                if end not in data: # give it a counter
                    end_id = id_counter
                    id_counter += 1
                else:
                    end_id = data[end]['code']

                data.setdefault(start, {'code': start_id, 'title': start,'links': set()})['links'].add(end_id)
                data.setdefault(end, {'code': end_id, 'title': end,'links': set()})

                counter -= 1

            else:
                break

        print "Writing 'rels.tsv'..."
        # grab each key, iterate through it to write lines to rels.tsv
        for key, value in data.iteritems():
            link_counter = 0
            for link in value['links']:
                rels.write(str(value['code']) + '\t' + str(link) + '\tLINKS_TO\n')
                link_counter += 1
            data[key].update({'degrees': link_counter})
        
        print "Writing nodes.tsv..."
        # sort the nodes by code before writing to nodes.tsv
        for page in sorted(data.values(), key=lambda k: k['code']):
            code = page['code']
            nodes.write(str(code) + '\t' + page['title'] + '\tPage\t'+ str(page['degrees']) + '\n')

if __name__ == "__main__":
    parse_links()

