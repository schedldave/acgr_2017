/**
 *
 */
'use strict';

var gl = null;
const camera = {
  rotation: {
    x: 0,
    y: 0
  }
};

//scene graph nodes
var root = null;
var rootnofloor = null;
var rotateLight;
var rotateNode;

//textures
var renderTargetColorTexture;
var renderTargetDepthTexture;
var floorTexture;

// shader
var parallaxHeightUniform, parallaxOcclusionHeightUniform;

// global Settings
var globalSettings = function(){};
globalSettings.height_scale = 0.05;

//load the required resources using a utility function
loadResources({
  vs: 'shader/normal.vs.glsl',
  fs: 'shader/parallax.fs.glsl',
  fs_occlusion: 'shader/parallax_occlusion.fs.glsl',
  texture_diffuse: '../textures/wood.png',
  texture_normal: '../textures/toy_box_normal.png',
  texture_height: '../textures/toy_box_disp.png',
}).then(function (resources /*an object containing our keys with the loaded resources*/) {
  init(resources);

  render(0);
});

function init(resources) {
  //create a GL context
  gl = createContext();


  gl.enable(gl.DEPTH_TEST);

  //create scenegraph
  root = createSceneGraph(gl, resources);

  initInteraction(gl.canvas);

  initGUI();
}

function createSceneGraph(gl, resources) {
  //create scenegraph
  parallaxHeightUniform = new SetUniformSGNode('u_height_scale',globalSettings.height_scale,
    []);
  const root = new ShaderSGNode(createProgram(gl, resources.vs, resources.fs));
  root.append(parallaxHeightUniform);


  //light debug helper function
  function createLightSphere() {
    let lightMat = new MaterialSGNode( [new RenderSGNode(makeSphere(.2,10,10))] );
    lightMat.emission = [1, 1, 1, 1]; // only set emission so sphere is white
    lightMat.ambient = lightMat.diffuse = lightMat.specular = [0, 0, 0, 1]; // everyting else is black (0)
    return lightMat;
  }

  {
    //initialize light
    var light = new LightSGNode(); //use now framework implementation of light node
    light.ambient = [0.2, 0.2, 0.2, 1];
    light.diffuse = [0.8, 0.8, 0.8, 1];
    light.specular = [1, 1, 1, 1];
    light.position = [0, 0, 0];

    rotateLight = new TransformationSGNode(mat4.create());
    let translateLight = new TransformationSGNode(glm.translate(0,2,2)); //translating the light is the same as setting the light position

    rotateLight.append(translateLight);
    translateLight.append(light);
    translateLight.append(createLightSphere()); //add sphere for debugging: since we use 0,0,0 as our light position the sphere is at the same position as the light source
    root.append(rotateLight);
  }

  {
    //initialize floor with advanced occlusion parallax mapping
    let ofloor =
            new MaterialSGNode(
              new TextureSGNode(resources.texture_diffuse, 0, 'u_diffuseTex',
                new TextureSGNode(resources.texture_normal, 1, 'u_normalTex',
                  new TextureSGNode(resources.texture_height, 2, 'u_heightTex',
                      new RenderSGNode(makeFloor(1,1))
            ))));

    //dark
    ofloor.ambient = [0, 0, 0, 1];
    ofloor.diffuse = [0.1, 0.1, 0.1, 1];
    ofloor.specular = [0.5, 0.5, 0.5, 1];
    ofloor.shininess = 50.0;
    ofloor.lights = [light]; // tell material which lights to use!

    // node for uniform
    parallaxOcclusionHeightUniform = new SetUniformSGNode('u_height_scale',globalSettings.height_scale,[] );

    // advanced parallax occlusion shader:
    var advancedShader = new ShaderSGNode(createProgram(gl, resources.vs, resources.fs_occlusion),[
        parallaxOcclusionHeightUniform,
        new TransformationSGNode(glm.transform({ translate: [ -1,1, -1], rotateX: -90, scale: 1}), [ ofloor ])
      ]);




    root.append( advancedShader );

  }
  {
    //initialize floor with simple parallax mapping
    let floor = new MaterialSGNode(
                new TextureSGNode(resources.texture_diffuse, 0, 'u_diffuseTex',
                  new TextureSGNode(resources.texture_normal, 1, 'u_normalTex',
                    new TextureSGNode(resources.texture_height, 2, 'u_heightTex',
                      new RenderSGNode(makeFloor(1,1))
                ))));

    //dark
    floor.ambient = [0, 0, 0, 1];
    floor.diffuse = [0.1, 0.1, 0.1, 1];
    floor.specular = [0.5, 0.5, 0.5, 1];
    floor.shininess = 50.0;

    root.append(new TransformationSGNode(glm.transform({ translate: [ 1,1, 1], rotateX: -90, scale: 1}), [
      floor
    ]));
  }

  {
    //initialize floor with normal mapping
    let floor = new MaterialSGNode(
                new TextureSGNode(resources.texture_diffuse, 0, 'u_diffuseTex',
                  new TextureSGNode(resources.texture_normal, 1, 'u_normalTex',
                    new RenderSGNode(makeFloor(1,1))
                )));

    //dark
    floor.ambient = [0, 0, 0, 1];
    floor.diffuse = [0.1, 0.1, 0.1, 1];
    floor.specular = [0.5, 0.5, 0.5, 1];
    floor.shininess = 50.0;

    root.append(new TransformationSGNode(glm.transform({ translate: [-1,1,1], rotateX: -90, scale: 1}), [
      floor
    ]));
  }
  {
    //initialize floor with diffuse only
    let floor = new MaterialSGNode(
                new TextureSGNode(resources.texture_diffuse, 0, 'u_diffuseTex',
                    new RenderSGNode(makeFloor(1,1))
                ));

    //dark
    floor.ambient = [0, 0, 0, 1];
    floor.diffuse = [0.1, 0.1, 0.1, 1];
    floor.specular = [0.5, 0.5, 0.5, 1];
    floor.shininess = 50.0;
    root.append(new TransformationSGNode(glm.transform({ translate: [ 1,1,-1], rotateX: -90, scale: 1}), [
      floor
    ]));
  }

  return root;
}

function makeFloor(w, h) {
  var width = w || 2;
  var height = h || 2;
  var position = [-width, -height, 0,   width, -height, 0,   width, height, 0,   -width, height, 0];
  var normal = [0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1];
  var texturecoordinates = [0, 0,   1, 0,   1, 1,   0, 1];
  //var texturecoordinates = [0, 0,   5, 0,   5, 5,   0, 5];
  var index = [0, 1, 2,   2, 3, 0];
  return {
    position: position,
    normal: normal,
    texture: texturecoordinates,
    index: index
  };
}

function render(timeInMilliseconds) {
  checkForWindowResize(gl);

  //setup viewport
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //setup context and camera matrices
  const context = createSGContext(gl);
  context.projectionMatrix = mat4.perspective(mat4.create(), convertDegreeToRadians(45), gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 100);
  //very primitive camera implementation
  let lookAtMatrix = mat4.lookAt(mat4.create(), [0,4,-4], [0,0.1,0], [0,1,0]);
  let mouseRotateMatrix = mat4.multiply(mat4.create(),
                          glm.rotateX(camera.rotation.y),
                          glm.rotateY(camera.rotation.x));
  context.viewMatrix = mat4.multiply(mat4.create(), lookAtMatrix, mouseRotateMatrix);

  //update animations
  context.timeInMilliseconds = timeInMilliseconds;

  rotateLight.matrix = glm.rotateY(timeInMilliseconds*0.05);

  // update height_scale uniform in shaders:
  parallaxHeightUniform.uniforms["u_height_scale"] = globalSettings.height_scale;
  parallaxOcclusionHeightUniform.uniforms["u_height_scale"] = globalSettings.height_scale;

  //render scenegraph
  root.render(context);

  //animate
  requestAnimationFrame(render);
}

//camera control
function initInteraction(canvas) {
  const mouse = {
    pos: { x : 0, y : 0},
    leftButtonDown: false
  };
  function toPos(event) {
    //convert to local coordinates
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  canvas.addEventListener('mousedown', function(event) {
    mouse.pos = toPos(event);
    mouse.leftButtonDown = event.button === 0;
  });
  canvas.addEventListener('mousemove', function(event) {
    const pos = toPos(event);
    const delta = { x : mouse.pos.x - pos.x, y: mouse.pos.y - pos.y };
    if (mouse.leftButtonDown) {
      //add the relative movement of the mouse to the rotation variables
  		camera.rotation.x += delta.x;
  		camera.rotation.y += delta.y;
    }
    mouse.pos = pos;
  });
  canvas.addEventListener('mouseup', function(event) {
    mouse.pos = toPos(event);
    mouse.leftButtonDown = false;
  });
  //register globally
  document.addEventListener('keypress', function(event) {
    //https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
    if (event.code === 'KeyR') {
      camera.rotation.x = 0;
  		camera.rotation.y = 0;
    }
  });
}

function convertDegreeToRadians(degree) {
  return degree * Math.PI / 180
}

function initGUI(){

  var gui = new dat.GUI();

  gui.add( globalSettings, 'height_scale' );

  gui.closed = true; // close gui to avoid using up too much screen

}
