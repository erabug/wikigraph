function drawGraph(json) {
  var width = 1000,
      height = 600;

  var color = d3.scale.category10();

  var svg = d3.select(".graph-result").append("svg")
      .attr("width", width)
      .attr("height", height);

  var force = d3.layout.force()
      .gravity(0.07) //originally 0.05
      .distance(90) //originally 100 and -100
      .charge(-100)
      .size([width, height]);

  // d3.json('response.json', function(error, json) {
    force
        .nodes(json.nodes)
        .links(json.links)
        .start();

    svg.append("svg:defs").selectAll("marker")
        .data(["arrow"])
      .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 23)
        // .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-4L10,0L0,4Z");

    var link = svg.selectAll(".link")
        .data(json.links)
      .enter().append("line")
        .attr("class", "link")
        .style("stroke", function(d) {
          if (d.value == 1) { return "#333"; }
          // return d.value;
        })
        // .style("stroke-width", function(d) {
        //   if (d.value == 1) {
        //     return "2";
        //   } else { return 1; }
        // })
        .attr("marker-end", "url(#arrow)");

    var node = svg.selectAll(".node")
        .data(json.nodes)
      .enter().append("g")
        .attr("class", "node")
        .call(force.drag);

    node.append("circle")
        // .attr("r", 8)
        .attr("r", function(d) {
          if (d.group == "path") {
            return 10;
          } else { return 8; }
        })
        // .style("stroke", function(d) {
        //   if (d.group == "path") {
        //     return "#333";
        //   } else { return "#fff"; }
        // })
        // .style("opacity", 0.8)
        .style("fill", function(d) {
          if (d.group == "path") {
            return "#333";
          } else { return color(d.type); }
        });
        // .style("fill", function(d) { return color(d.type); });

    // node.append("text")
    //     .attr("dx", 23)
    //     .attr("dy", ".35em")
    //     // .style("fill", "white")
    //     .text(function(d) { return d.name; });

    node.append("title")
        .text(function(d) { return d.name + " (" + d.id + "), " + d.type; });

    force.on("tick", function() {
      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    });
  // });
}