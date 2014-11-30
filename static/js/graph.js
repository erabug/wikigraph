function drawGraph(json) {

    // console.log("raw data:", json);


    // establish width and height of the svg
    var width = 700,
        height = 550;

    // color established as a scale
    var color = d3.scale.category20();

    // appends svg tag to graph div
    var svg = d3.select(".graph").append("svg")
        .attr("width", width)
        .attr("height", height);

    // this function handles the parameters of the force-directed layout
    var force = d3.layout.force()
        .gravity(0.08)
        .distance(function(d) {
          if (d.value == 1) {
            return 110;
          } else {
            return Math.floor(Math.random() * (110 - 70)) + 70;
        }
        })
        .charge(-200)
        .size([width, height]);

    var defs = svg.append("defs");
        // .attr("id", "imgdefs");

    // this appends the marker tag to the svg tag, applies arrowhead attributes
    defs.selectAll("marker")
            .data(["arrow"])
        .enter().append("svg:marker")
            .attr("id", String)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 10)
            .attr("markerWidth", 7)
            .attr("markerHeight", 7)
            .attr("orient", "auto")
            .style("fill", "#666")
            .append("svg:path")
            .attr("d", "M0,-4L10,0L0,4Z");

    var diagonal = d3.svg.diagonal()
        .projection(function(d) { return [d.y, d.x]; });

    var link = svg.selectAll(".link")
            .data(json.links)
        .enter().append("path")
            .attr("class", "link")
            .style("stroke", "#666")
            .attr("marker-end", "url(#arrow)")
            .attr("d", diagonal);

    // select subset of g that are nodes
    var node = svg.selectAll("g.node")
          .data(json.nodes)
        .enter().append("svg:g")
          .attr("class", "node")
          .attr("id", function(d) {return d.title + '|' + d.code;})
          .call(force.drag);

    // select subset of nodes that are in the path
    var pathNode = node.filter(function(d) {
        return d.group == "path";
    });

    var nonPathNode = node.filter(function(d) {
        return d.group != "path";
    });

    var pathLink = link.filter(function(d) {
        return d.value == 1;
    });

    var start;
    Object.keys(queryImages).forEach(function(key) {

        img = queryImages[key];
        if (img.code === 0) {
          start = key;
        }
        defs.append("clipPath")
            .attr("id", 'img'+key.toString())
          .append("circle")
            .attr("r", 45);
    });

    var startNode = pathNode.filter(function(d) {
        return d.code == start;
    });

    pathLink
        .style("stroke-width", "3px")
        .attr("marker-end", "url(#arrow)");


    nonPathNode.append("circle")
        .attr("r", function(d) {
            var size;
            if (d.degrees > 300) {
                d.radius = 20;
            } else {
                d.radius = d.degrees*0.02+7;
            }
            return d.radius;
        })
        .style("fill", function(d) { return color(d.degrees); });

    pathNode.append("circle")
        .attr("r", function(d) {
            d.radius = 45
            return d.radius
        })
        .style("fill", "#fff"); // white background for the .gifs

    pathNode.append("image")
        .attr("xlink:href", function(d) { return queryImages[d.code].url;})
        .attr("x", function(d) { return -queryImages[d.code].width/2;})
        // this seems to help for portraits, where height > width
        .attr("y", function(d) {
          var h = queryImages[d.code].height;
          var x;
          if (h > queryImages[d.code].width) { x = 12; } else { x = 0; }
          return -(h/2)+x;
        })
        .attr("height", function(d) { return queryImages[d.code].height;})
        .attr("width", function(d) { return queryImages[d.code].width;})
        .attr("clip-path", function(d) {
            var x = 'img'+d.code;
            return "url(#"+x+")"; // unique clip path for this node
        });

    pathNode.append("circle") // outline for the path nodes
        .attr("r", 45)
        .style("fill", "none")
        .style("stroke", "#333")
        .style("stroke-width", "2px");

    startNode.each(function(d) {
        var numNodes = Object.keys(queryImages).length;
        d.fixed = true;
        d.x = width/numNodes;
        d.y = height/3;
    });

    // this calls the function force on the nodes and links
    force
        .nodes(json.nodes)
        .links(json.links)
        .start();

    force.on("tick", function() {

        node.attr("cx", function(d) { return d.x = Math.max(15, Math.min(width - 15, d.x)); })
            .attr("cy", function(d) { return d.y = Math.max(15, Math.min(height - 15, d.y)); });

        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        link.attr("d", function(d) {
            // Total difference in x and y from source to target
            diffX = d.target.x - d.source.x;
            diffY = d.target.y - d.source.y;

            // Length of path from center of source node to center of target node
            pathLength = Math.sqrt((diffX * diffX) + (diffY * diffY));

            // x and y distances from center to outside edge of target node
            offsetX = (diffX * d.target.radius) / pathLength;
            offsetY = (diffY * d.target.radius) / pathLength;

            return "M" + d.source.x + "," + d.source.y + "L" + (d.target.x - offsetX) + "," + (d.target.y - offsetY);
        });

      node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    });
    // for each tick, the distance between each pair of linked nodes is computed,
    // the links move to converge on the desired distance
    // force.on("tick", function() {
    //   link.attr("x1", function(d) { return d.source.x; })
    //       .attr("y1", function(d) { return d.source.y; })
    //       .attr("x2", function(d) { return d.target.x; })
    //       .attr("y2", function(d) { return d.target.y; });
    //   node.attr("transform", function(d) {
    //     return "translate(" + d.x + "," + d.y + ")";
    //   });

    // });
}