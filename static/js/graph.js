function drawGraph(json) {

    var pathLength = Object.keys(queryInfo).length;

    // establish width and height of the svg
    var width = 600,
        height = pathLength * 110; // set svg height based on path length

    // color established as a scale
    var color = d3.scale.category20();

    // appends svg tag to graph div
    var svg = d3.select('.graph').append('svg')
        .attr('width', width)
        .attr('height', height);

    // this function handles the parameters of the force-directed layout
    var force = d3.layout.force()
        .gravity(0.05)
        .linkDistance(function(d) {
          if (d.value == 1) { // if in the path
            return 115;
          } else {
            return Math.floor(Math.random() * (100 - 70)) + 70;
        }
        })
        .charge(-100)
        .size([width, height]);

    var defs = svg.append('defs');

    // this appends the marker tag to the svg tag, applies arrowhead attributes
    defs.selectAll('marker')
            .data(['arrow'])
        .enter().append('svg:marker')
            .attr('id', String)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 9)
            .attr('markerWidth', 7)
            .attr('markerHeight', 7)
            .attr('orient', 'auto')
            .style('fill', '#666')
            .append('svg:path')
            .attr('d', 'M0,-4L10,0L0,4Z');

    // this helps predict where the arrowhead should be on the link path
    var diagonal = d3.svg.diagonal()
        .projection(function(d) {
            return [d.y, d.x];
        });

    // establish links
    var link = svg.selectAll('.link')
            .data(json.links)
        .enter().append('path')
            .attr('class', 'link')
            .style('stroke', '#666')
            .style('opacity', 0.6)
            .attr('marker-end', 'url(#arrow)')
            .attr('d', diagonal);

    // establish nodes
    var node = svg.selectAll('g.node')
            .data(json.nodes)
        .enter().append('svg:g')
            .attr('class', 'node')
            .attr('id', function(d) {
                return d.title + '|' + d.code;
            })
            .call(force.drag);

    // define path ndoes
    var pathNode = node.filter(function(d) {
        return d.group == 'path';
    });

    // define non-path nodes
    var nonPathNode = node.filter(function(d) {
        return d.group != 'path';
    });

    // define path links
    var pathLink = link.filter(function(d) {
        return d.value == 1;
    });

    var start;
    Object.keys(queryInfo).forEach(function(key) {
        var img = queryInfo[key]; // identify the start node
        if (img.code === 0) start = key;
        defs.append('clipPath') // define clip paths for each path node
            .attr('id', 'img' + key.toString())
          .append('circle')
            .attr('r', 45);
    });

    // define the start node
    var startNode = pathNode.filter(function(d) {
        return d.code == start;
    });

    // add styling for the path links
    pathLink
        .style('stroke-width', '3px')
        .style('opacity', 1)
        .attr('marker-end', 'url(#arrow)');

    // append colored circles to non-path nodes
    nonPathNode.append('circle')
        .attr('r', function(d) {
            var size;
            if (d.degrees > 600) { // upper bound for scaling size on degrees
                d.radius = 18; // assign radius to node attribute for arrowhead placement
            } else {
                d.radius = d.degrees * 0.02 + 7; // scales linear with degrees
            }
            return d.radius;
        })
        .style('fill', function(d) {
            return color(d.degrees); // colors based on degrees
        });

    // append white circles to path nodes (for the .gifs)
    pathNode.append('circle')
        .attr('r', function(d) {
            d.radius = 45;
            return d.radius;
        })
        .style('fill', '#fff');

    // append clip-path to each path node
    pathNode.append('image')
        .attr('xlink:href', function(d) { return queryInfo[d.code].url;})
        .attr('x', function(d) { return -queryInfo[d.code].width / 2;})
        // this seems to help for portraits, where height > width
        .attr('y', function(d) {
            var h = queryInfo[d.code].height;
            var x;
            if (h > queryInfo[d.code].width) x = 12; else x = 0;
            return -(h / 2) + x;
        })
        .attr('height', function(d) { return queryInfo[d.code].height;})
        .attr('width', function(d) { return queryInfo[d.code].width;})
        .attr('clip-path', function(d) {
            var x = 'img' + d.code;
            return 'url(#' + x + ')'; // unique clip path for this node
        });

    pathNode.append('circle') // outline for the path nodes
        .attr('r', 45)
        .style('fill', 'none')
        .style('stroke', '#333')
        .style('stroke-width', '2px');

    startNode.each(function(d) {
        d.fixed = true;
        d.x = width/pathLength;
        d.y = height/pathLength;
    });

    // this calls the function force on the nodes and links
    force
        .nodes(json.nodes)
        .links(json.links)
        .start();

    // this occurs each time 'tick' is called by d3
    force.on('tick', function() {
        node.attr('cx', function(d) {
                d.x = Math.max(15, Math.min(width - 15, d.x));
                return d.x;
            })
            .attr('cy', function(d) {
                d.y = Math.max(15, Math.min(height - 15, d.y));
                return d.y;
            })
            .attr('transform', function(d) {
                return 'translate(' + d.x + ',' + d.y + ')';
            });
        link.attr('x1', function(d) { return d.source.x; })
            .attr('y1', function(d) { return d.source.y; })
            .attr('x2', function(d) { return d.target.x; })
            .attr('y2', function(d) { return d.target.y; })
            .attr('d', function(d) { // this places arrowheads based on radius
                // Total difference in x and y from source to target
                diffX = d.target.x - d.source.x;
                diffY = d.target.y - d.source.y;
                // Length of path from center of source node to center of target node
                pathLength = Math.sqrt((diffX * diffX) + (diffY * diffY));
                // x and y distances from center to outside edge of target node
                offsetX = (diffX * d.target.radius) / pathLength;
                offsetY = (diffY * d.target.radius) / pathLength;
                return 'M' + d.source.x + ',' + d.source.y + 'L' +
                    (d.target.x - offsetX) + ',' + (d.target.y - offsetY);
        });
        // node.attr('transform', function(d) {
        //     return 'translate(' + d.x + ',' + d.y + ')';
        // });
    });

}