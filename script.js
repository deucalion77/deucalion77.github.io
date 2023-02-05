window.onload = init;

function init() {
  var root = new THREERoot({
    createCameraControls:!true,
    antialias:((window.devicePixelRatio || 1) == 1),
    fov:90
  });
  root.renderer.setClearColor(0x000000);
  root.renderer.setPixelRatio(window.devicePixelRatio || 1);
  root.camera.position.set(0, 0, 300);

  var textAnimation = createTextAnimation();
  root.scene.add(textAnimation);

  var light = new THREE.DirectionalLight();
  light.position.set(0, 0, 1);
  root.scene.add(light);

  var tl = new TimelineMax({
    repeat:-1,
    repeatDelay:0.25,
    yoyo:true
  });
  tl.fromTo(textAnimation, 8,
    {animationProgress:0.0},
    {animationProgress:0.8, ease:Power1.easeInOut},
    0
  );
  tl.to(root.camera.position, 8, {z:-350, ease:Power1.easeInOut}, 0);

  createTweenScrubber(tl);
}

function createTextAnimation() {
  var geometry = generateTextGeometry('AMARASINGHE  KALUARACHCHIGE NIPUN ANUPAMA', {
    size:14,
    height:4,
    font:'droid sans',
    weight:'bold',
    style:'normal',
    curveSegments:24,
    bevelSize:1,
    bevelThickness:1,
    bevelEnabled:true,
    anchor:{x:0.5, y:0.5, z:0.5}
  });

  THREE.BAS.Utils.separateFaces(geometry);

  return new TextAnimation(geometry);
}

function generateTextGeometry(text, params) {
  var geometry = new THREE.TextGeometry(text, params);

  geometry.computeBoundingBox();

  geometry.userData = {};
  geometry.userData.size = {
    width: geometry.boundingBox.max.x - geometry.boundingBox.min.x,
    height: geometry.boundingBox.max.y - geometry.boundingBox.min.y,
    depth: geometry.boundingBox.max.z - geometry.boundingBox.min.z
  };

  var anchorX = geometry.userData.size.width * -params.anchor.x;
  var anchorY = geometry.userData.size.height * -params.anchor.y;
  var anchorZ = geometry.userData.size.depth * -params.anchor.z;
  var matrix = new THREE.Matrix4().makeTranslation(anchorX, anchorY, anchorZ);

  geometry.applyMatrix(matrix);

  return geometry;
}

////////////////////
// CLASSES
////////////////////

function TextAnimation(textGeometry) {
  var bufferGeometry = new THREE.BAS.ModelBufferGeometry(textGeometry);

  var aAnimation = bufferGeometry.createAttribute('aAnimation', 2);
  var aCentroid = bufferGeometry.createAttribute('aCentroid', 3);
  var aControl0 = bufferGeometry.createAttribute('aControl0', 3);
  var aControl1 = bufferGeometry.createAttribute('aControl1', 3);
  var aEndPosition = bufferGeometry.createAttribute('aEndPosition', 3);
  var aAxisAngle = bufferGeometry.createAttribute('aAxisAngle', 4);

  var faceCount = bufferGeometry.faceCount;
  var i, i2, i3, i4, v;
  var keys = ['a', 'b', 'c'];
  var vDelay = new THREE.Vector3();

  var maxDelay = 0.0;
  var minDuration = 1.0;
  var maxDuration = 1.0;
  var stretch = 0.0125;
  var lengthFactor = 0.01;
  var maxLength = textGeometry.boundingBox.max.length();

  this.animationDuration = maxDuration + maxDelay + stretch + lengthFactor * maxLength;
  this._animationProgress = 0;

  var distanceZ = -400;

  var axis = new THREE.Vector3();
  var angle;

  for (i = 0, i2 = 0, i3 = 0, i4 = 0; i < faceCount; i++, i2 += 6, i3 += 9, i4 += 12) {
    var face = textGeometry.faces[i];
    var centroid = THREE.BAS.Utils.computeCentroid(textGeometry, face);

    // animation
    var delay = centroid.length() * lengthFactor + Math.random() * maxDelay;
    var duration = THREE.Math.randFloat(minDuration, maxDuration);

    for (v = 0; v < 6; v += 2) {
      var vertex = textGeometry.vertices[face[keys[v * 0.5]]];
      var vertexDelay = vDelay.subVectors(centroid, vertex).length() * 0.0001;

      aAnimation.array[i2 + v    ] = delay + vertexDelay + stretch * Math.random();
      aAnimation.array[i2 + v + 1] = duration;
    }

    // centroid
    for (v = 0; v < 9; v += 3) {
      aCentroid.array[i3 + v    ] = centroid.x;
      aCentroid.array[i3 + v + 1] = centroid.y;
      aCentroid.array[i3 + v + 2] = centroid.z;
    }

    // ctrl
    var c0x = centroid.x * THREE.Math.randFloat(0.75, 1.0);
    var c0y = centroid.y * THREE.Math.randFloat(0.75, 1.0);
    var c0z = distanceZ * THREE.Math.randFloat(0.5, 0.75);

    var c1x = centroid.x * THREE.Math.randFloat(0.25, 0.5);
    var c1y = centroid.y * THREE.Math.randFloat(0.25, 0.5);
    var c1z = distanceZ * THREE.Math.randFloat(0.75, 1.0);

    for (v = 0; v < 9; v += 3) {
      aControl0.array[i3 + v    ] = c0x;
      aControl0.array[i3 + v + 1] = c0y;
      aControl0.array[i3 + v + 2] = c0z;

      aControl1.array[i3 + v    ] = c1x;
      aControl1.array[i3 + v + 1] = c1y;
      aControl1.array[i3 + v + 2] = c1z;
    }

    // end position
    var x, y, z;

    x = 0;
    y = 0;
    z = distanceZ;

    for (v = 0; v < 9; v += 3) {
      aEndPosition.array[i3 + v    ] = x;
      aEndPosition.array[i3 + v + 1] = y;
      aEndPosition.array[i3 + v + 2] = z;
    }

    // axis angle
    // axis.x = THREE.Math.randFloatSpread(0.25);
    // axis.y = THREE.Math.randFloatSpread(0.25);
    // axis.z = 1.0;
    // axis.x = -centroid.x * 0.0001;
    // axis.y = centroid.y * 0.0005;
    axis.x = 0;
    axis.y = 0;
    axis.z = 1;

    axis.normalize();

    angle = Math.PI * THREE.Math.randFloat(4, 6);
    // angle = Math.PI * 4;

    for (v = 0; v < 12; v += 4) {
      aAxisAngle.array[i4 + v    ] = axis.x;
      aAxisAngle.array[i4 + v + 1] = axis.y;
      aAxisAngle.array[i4 + v + 2] = axis.z;
      aAxisAngle.array[i4 + v + 3] = angle;
    }
  }

  var material = new THREE.BAS.PhongAnimationMaterial({
      shading: THREE.FlatShading,
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uTime: {type: 'f', value: 0}
      },
      shaderFunctions: [
        THREE.BAS.ShaderChunk['cubic_bezier'],
        THREE.BAS.ShaderChunk['ease_out_cubic'],
        THREE.BAS.ShaderChunk['quaternion_rotation']
      ],
      shaderParameters: [
        'uniform float uTime;',
        'uniform vec3 uAxis;',
        'uniform float uAngle;',
        'attribute vec2 aAnimation;',
        'attribute vec3 aCentroid;',
        'attribute vec3 aControl0;',
        'attribute vec3 aControl1;',
        'attribute vec3 aEndPosition;',
        'attribute vec4 aAxisAngle;'
      ],
      shaderVertexInit: [
        'float tDelay = aAnimation.x;',
        'float tDuration = aAnimation.y;',
        'float tTime = clamp(uTime - tDelay, 0.0, tDuration);',
        'float tProgress =  ease(tTime, 0.0, 1.0, tDuration);'
         //'float tProgress = tTime / tDuration;'
      ],
      shaderTransformPosition: [
        // 'transformed -= aCentroid;',
        'transformed *= 1.0 - tProgress;',
        // 'transformed += aCentroid;',

        'transformed += cubicBezier(transformed, aControl0, aControl1, aEndPosition, tProgress);',
        // 'transformed += aEndPosition * tProgress;'

        'float angle = aAxisAngle.w * tProgress;',
        'vec4 tQuat = quatFromAxisAngle(aAxisAngle.xyz, angle);',
        'transformed = rotateVector(tQuat, transformed);'
      ]
    },
    {
      diffuse: 0xffffff
    }
  );

  THREE.Mesh.call(this, bufferGeometry, material);

  this.frustumCulled = false;
}
TextAnimation.prototype = Object.create(THREE.Mesh.prototype);
TextAnimation.prototype.constructor = TextAnimation;

Object.defineProperty(TextAnimation.prototype, 'animationProgress', {
  get: function() {
    return this._animationProgress;
  },
  set: function(v) {
    this._animationProgress = v;
    this.material.uniforms['uTime'].value = this.animationDuration * v;
  }
});

function THREERoot(params) {
  params = utils.extend({
    fov:60,
    zNear:1,
    zFar:10000,

    createCameraControls:true
  }, params);

  this.renderer = new THREE.WebGLRenderer({
    antialias:params.antialias
  });
  this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  document.getElementById('three-container').appendChild(this.renderer.domElement);

  this.camera = new THREE.PerspectiveCamera(
    params.fov,
    window.innerWidth / window.innerHeight,
    params.zNear,
    params.zfar
  );

  this.scene = new THREE.Scene();

  if (params.createCameraControls) {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
  }

  this.resize = this.resize.bind(this);
  this.tick = this.tick.bind(this);

  this.resize();
  this.tick();

  window.addEventListener('resize', this.resize, false);
}
THREERoot.prototype = {
  tick: function() {
    this.update();
    this.render();
    requestAnimationFrame(this.tick);
  },
  update: function() {
    this.controls && this.controls.update();
  },
  render: function() {
    this.renderer.render(this.scene, this.camera);
  },
  resize: function() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
};

////////////////////
// UTILS
////////////////////

var utils = {
  extend:function(dst, src) {
    for (var key in src) {
      dst[key] = src[key];
    }

    return dst;
  },
  randSign: function() {
    return Math.random() > 0.5 ? 1 : -1;
  }
};

function createTweenScrubber(tween, seekSpeed) {
  seekSpeed = seekSpeed || 0.001;

  function stop() {
    TweenMax.to(tween, 2, {timeScale:0});
  }

  function resume() {
    TweenMax.to(tween, 2, {timeScale:1});
  }

  function seek(dx) {
    var progress = tween.progress();
    var p = THREE.Math.clamp((progress + (dx * seekSpeed)), 0, 1);

    tween.progress(p);
  }

  var _cx = 0;

  // desktop
  var mouseDown = false;
  document.body.style.cursor = 'pointer';

  window.addEventListener('mousedown', function(e) {
    mouseDown = true;
    document.body.style.cursor = 'ew-resize';
    _cx = e.clientX;
    stop();
  });
  window.addEventListener('mouseup', function(e) {
    mouseDown = false;
    document.body.style.cursor = 'pointer';
    resume();
  });
  window.addEventListener('mousemove', function(e) {
    if (mouseDown === true) {
      var cx = e.clientX;
      var dx = cx - _cx;
      _cx = cx;

      seek(dx);
    }
  });
  // mobile
  window.addEventListener('touchstart', function(e) {
    _cx = e.touches[0].clientX;
    stop();
    e.preventDefault();
  });
  window.addEventListener('touchend', function(e) {
    resume();
    e.preventDefault();
  });
  window.addEventListener('touchmove', function(e) {
    var cx = e.touches[0].clientX;
    var dx = cx - _cx;
    _cx = cx;

    seek(dx);
    e.preventDefault();
  });
}
// smoke effect
/////////////////////////

$(function() {
  "use strict";
  var a = 0;
  $('#tv').hide();
  for (; a < 25; a += 1) {
    setTimeout(function b() {
      var a = Math.random() * 1e3 + 5e3,
        c = $("<div />", {
          "class": "smoke",
          css: {
            left: Math.random() * 800,
            backgroundSize: "contain",
            width: Math.random() * 800,
            height: Math.random() * 600
          }
        });
      $(c).addClass("animated");
      $(c).addClass("zoomIn");
      $(c).addClass("rollOut");
      $(c).appendTo("#viewport");
      $.when($(c).animate({}, {
          duration: a / 4,
          easing: "linear",
          queue: false,
          complete: function() {
            $(c).animate({}, {
              duration: a / 3,
              easing: "linear",
              queue: false
            })
          }
        }),
        $(c).animate({
          bottom: $("#viewport").height()
        }, {
          duration: a,
          easing: "linear",
          queue: false
        })).then(
        function() {
          $(c).remove();
          b()
        })
    }, Math.random() * 3e3)
  }
  $("body").keypress(function() {
    $('body').addClass("fadeOut");
    setTimeout(function() {
      $('#tv').show();
    }, 1000);

    console.log("Handler for .keypress() called.");
  });
}())
var tag = document.createElement('script');
tag.src = 'https://www.youtube.com/player_api';
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
var tv,
  playerDefaults = {
    autoplay: 0,
    autohide: 1,
    modestbranding: 0,
    rel: 0,
    showinfo: 0,
    controls: 0,
    disablekb: 1,
    enablejsapi: 0,
    iv_load_policy: 3
  };
var vid = [{
    'videoId': '2b5QNj-BVhs',
    'startSeconds': 515,
    'endSeconds': 690,
    'suggestedQuality': 'hd720'
  }, {
    'videoId': '9ge5PzHSS0Y',
    'startSeconds': 465,
    'endSeconds': 657,
    'suggestedQuality': 'hd720'
  }, {
    'videoId': 'OWsCt7B-KWs',
    'startSeconds': 0,
    'endSeconds': 240,
    'suggestedQuality': 'hd720'
  }, {
    'videoId': 'qMR-mPlyduE',
    'startSeconds': 19,
    'endSeconds': 241,
    'suggestedQuality': 'hd720'
  }],
  randomvid = Math.floor(Math.random() * (vid.length - 1 + 1));

function onYouTubePlayerAPIReady() {
  tv = new YT.Player('tv', {
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    },
    playerVars: playerDefaults
  });
}

function onPlayerReady() {
  tv.loadVideoById(vid[randomvid]);
  tv.mute();
}

function onPlayerStateChange(e) {
  if (e.data === 1) {
    $('#tv').addClass('active');
  } else if (e.data === 0) {
    tv.seekTo(vid[randomvid].startSeconds)
  }
}

function vidRescale() {

  var w = $(window).width() + 200,
    h = $(window).height() + 200;

  if (w / h > 16 / 9) {
    tv.setSize(w, w / 16 * 9);
    $('.tv .screen').css({
      'left': '0px'
    });
  } else {
    tv.setSize(h / 9 * 16, h);
    $('.tv .screen').css({
      'left': -($('.tv .screen').outerWidth() - w) / 2
    });
  }
}

$(window).on('load resize', function() {
  vidRescale();
});

$('.hi span').on('click', function() {
  $('#tv').toggleClass('mute');
  if ($('#tv').hasClass('mute')) {
    tv.mute();
  } else {
    tv.unMute();
  }
});



// animate on scroll
////////////////////////

// Check if elem is in viewport
  function isElementInViewport(elem) {
      var $elem = elem;

      // Get the scroll position of the page.
      var scrollElem = ((navigator.userAgent.toLowerCase().indexOf('webkit') != -1) ? 'body' : 'html');
      var viewportTop = $(scrollElem).scrollTop();
      var viewportBottom = viewportTop + $(window).height();

      // Get the position of the element on the page.
      var elemTop = Math.round($elem.offset().top);
      var elemBottom = elemTop + $elem.height();

      return ((elemTop < viewportBottom) && (elemBottom > viewportTop));
  }

  // Check if it's time to start the animation.
  function checkAnimation(elem) {
      var $elem = elem;
      if ($elem.hasClass('start')) return;
      if (isElementInViewport($elem)) {
          $elem.addClass('start');

          //animated progess bars
                  bar_width = $elem.attr('aria-valuenow');
                  $elem.css('width',bar_width + '%');
      }
  }


  // Capture scroll events
  $(window).scroll(function () {
      $('.exp-bar').each(function(){
          checkAnimation($(this));
      });
  });