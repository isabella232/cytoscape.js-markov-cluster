;(function(){ 'use strict';

  var defaults = {
    expandFactor: 2,      //
    inflateFactor: 2,     //
    multFactor: 1,        // self loops for each node
    maxIterations: 10,    //
    attributes: [
        function(edge) {
          return 1;
        }
    ]
  };

  var setOptions = function( opts, options ) {
    for (var i in defaults) { opts[i] = defaults[i]; }
    for (var i in options)  { opts[i] = options[i];  }
  };

  var printMatrix = function( M ) { // used for debugging purposes only
    var n = Math.sqrt(M.length);
    for ( var i = 0; i < n; i++ ) {
      var row = '';
      for ( var j = 0; j < n; j++ ) {
        row += Math.round(M[i*n+j]*1000)/1000 + ' ';
      }
      console.log(row);
    }
    console.log('');
  };

  var getSimilarity = function( edge, attributes ) {
    var total = 0;
    for ( var i = 0; i < attributes.length; i++ ) {
      total += attributes[i]( edge );
    }
    return total;
  };

  var addLoops = function( M, n, val ) {
    for (var i = 0; i < n; i++) {
      M[i * n + i] = val;
    }
  };

  var normalize = function( M, n ) {
    var sum;
    for (var col = 0; col < n; col++) {
      sum = 0;
      for (var row = 0; row < n; row++) {
        sum += M[row * n + col];
      }
      for (var row = 0; row < n; row++) {
        M[row * n + col] = M[row * n + col] / sum;
      }
    }
  };

  // TODO: blocking matrix multiplication?
  var mmult = function( A, B, n ) {
    var C = new Array(n*n);
    var i, j, k;
    for (i=0; i<n; i++) {
      for (j=0; j<n; j++)
        C[i*n+j] = 0;

      for (k=0; k<n; k++) {
        for (j=0; j<n; j++) {
          C[i*n+j] += A[i*n+k]*B[k*n+j];
        }
      }
    }
    return C;
  };

  var expand = function( M, n, expandFactor /** power **/ ) {
    var _M = M.slice();

    for (var p = 1; p < expandFactor; p++) {
      M = mmult( M, _M, n );
    }
    return M;
  };

  var inflate = function( M, n, inflateFactor /** r **/ ) {
    var _M = new Array( n * n );

    // M(i,j) ^ inflatePower
    for (var i=0; i<n*n; i++) {
      _M[i] = M[i]*M[i];//Math.pow(M[i],inflateFactor);
    }

    normalize( _M, n );

    return _M;
  };

  var hasConverged = function( M, iterations ) {

    return false;
  };

  var markovCluster = function( options ) {
    var nodes = this.nodes();
    var edges = this.edges();
    var cy = this.cy();
    var opts = {};

    // Set parameters of algorithm:
    setOptions( opts, options );

    // Map each node to its position in node array
    var id2position = {};
    for( var i = 0; i < nodes.length; i++ ){
      id2position[ nodes[i].id() ] = i;
    }

    // Generate stochastic matrix M from input graph G (should be symmetric/undirected)
    var n = nodes.length, n2 = n * n;
    var M = new Array( n2 );
    for (var i = 0; i < n2; i++) {
      M[i] = 0;
    }

    for ( var e = 0; e < edges.length; e++ ) {
      var edge = edges[e];
      var i = id2position[ edge.source().id() ];
      var j = id2position[ edge.target().id() ];
      M[i * n + j] += getSimilarity( edge, opts.attributes ); // G should be symmetric and undirected
    }

    // Begin Markov cluster algorithm
    var clusters = [];

    // Step 1: Add self loops to each node, ie. add multFactor to matrix diagonal
    addLoops( M, n, opts.multFactor );

    // Step 2: M = normalize( M );
    normalize( M, n );

    var isStillMoving = true;
    var iterations = 0;

    while ( isStillMoving && iterations < opts.maxIterations ) {

      isStillMoving = false;

      // Step 3:
      M = expand( M, n, opts.expandFactor );

      // Step 4:
      M = inflate( M, n, opts.inflateFactor );

      //printMatrix( M );
      //debugger;

      // Step 5: check to see if ~steady state has been reached
      if ( ! hasConverged( M, iterations ) ) {
        isStillMoving = true;
      }

      iterations++;
    }

    return clusters;
  };

  // registers the extension on a cytoscape lib ref
  var register = function( cytoscape ){

    if( !cytoscape ){ return; } // can't register if cytoscape unspecified

    // main entry point
    cytoscape( 'collection', 'markovCluster', markovCluster );

  };

  if( typeof module !== 'undefined' && module.exports ){ // expose as a commonjs module
    module.exports = register;
  }

  if( typeof define !== 'undefined' && define.amd ){ // expose as an amd/requirejs module
    define('cytoscape-markov-cluster', function(){
      return register;
    });
  }

  if( typeof cytoscape !== 'undefined' ){ // expose to global cytoscape (i.e. window.cytoscape)
    register( cytoscape );
  }

})();
