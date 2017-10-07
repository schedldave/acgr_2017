/**
 */

var gl = null;
var root = null;
var fieldOfViewInRadians = convertDegreeToRadians(45);
var rotateLight, rotateLight2, rotateNode; // transformation nodes
var light;
var c3po, floor; // material
var phongProgramm, staticProgramm; // shader programs (vs + fs)
var c3poModel, teapotModel;
var models = [];
const camera = {
  rotation: {
    x: 0,
    y: 0
  }
};

//load the shader resources using a utility function
loadResources({
  vs: 'shader/phong.vs.glsl',
  fs: 'shader/phong.fs.glsl', //phong
  model: '../models/C-3PO.obj',
  model2: '../models/teapot.obj'
}).then(function (resources /*an object containing our keys with the loaded resources*/) {
  init(resources);

  render(0);
});

function init(resources) {
  //create a GL context
  gl = createContext();

  //enable depth test to let objects in front occluse objects further away
  gl.enable(gl.DEPTH_TEST);

  root = createSceneGraph(gl, resources);
  initInteraction(gl.canvas);

  initGUI();

}

function createSceneGraph(gl, resources) {
  //create scenegraph
  phongProgramm = createProgram(gl, resources.vs, resources.fs);
  models = { c3po: [new RenderSGNode(resources.model)],
             teapot: [new TransformationSGNode(glm.transform({scale:[.1,.1,.1], translate:[0,.9,0]}), [new RenderSGNode(resources.model2)])] };
  const root = new ShaderSGNode(phongProgramm);

  function createLightSphere() {
    let lightMat = new MaterialSGNode( [new RenderSGNode(makeSphere(.2,10,10))] );
    lightMat.emission = [1, 1, 1, 1]; // only set emission so sphere is white
    lightMat.ambient = lightMat.diffuse = lightMat.specular = [0, 0, 0, 1]; // everyting else is black (0)
    return lightMat;
  }

  {
    // create white light node
    light = new LightSGNode();
    light.ambient = [0, 0, 0, 1];
    light.diffuse = [1, 1, 1, 1];
    light.specular = [1, 1, 1, 1];
    light.position = [0, 2, 2];
    light.append(createLightSphere());
    rotateLight = new TransformationSGNode(mat4.create(), [
        light
    ]);
    root.append(rotateLight);
  }

  {
    //wrap shader with material node
    c3po = new MaterialSGNode(
      Object.values(models)[0]
    );
    //gold
    c3po.ambient = [0.24725, 0.1995, 0.0745, 1];
    c3po.diffuse = [0.75164, 0.60648, 0.22648, 1];
    c3po.specular = [0.628281, 0.555802, 0.366065, 1];
    c3po.shininess = 50;
    c3po.lights = [light];

    rotateNode = new TransformationSGNode(mat4.create(), [
      new TransformationSGNode(glm.transform({ translate: [0,0, 0], rotateX : 0, scale: 0.8 }),  [
        c3po
      ])
    ]);
    root.append(rotateNode);
  }

  {
    //wrap shader with material node
    floor = new MaterialSGNode([
      new RenderSGNode(makeRect())
    ]);

    //dark
    floor.ambient = [0, 0, 0, 1];
    floor.diffuse = [0.8, 0.8, 0.8, 1];
    floor.specular = [0.5, 0.5, 0.5, 1];
    floor.shininess = 0.3;
    floor.lights = [light];

    root.append(new TransformationSGNode(glm.transform({ translate: [0,0,0], rotateX: -90, scale: 2}), [
      floor
    ]));
  }

  return root;
}

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
    //add delta mouse to camera.rotation if the left mouse button is pressed
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


function render(timeInMilliseconds) {
  checkForWindowResize(gl);

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  //set background color to light gray
  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  //clear the buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  const context = createSGContext(gl);
  context.projectionMatrix = mat4.perspective(mat4.create(), fieldOfViewInRadians, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 100);

  //ReCap: what does this mean?
  context.viewMatrix = mat4.lookAt(mat4.create(), [0,3,-10], [0,0,0], [0,1,0]);

  //rotate whole scene according to the mouse rotation stored in
  //camera.rotation.x and camera.rotation.y
  context.sceneMatrix = mat4.multiply(mat4.create(),
                            glm.rotateY(camera.rotation.x),
                            glm.rotateX(camera.rotation.y));

  rotateNode.matrix = glm.rotateY(timeInMilliseconds*-0.01);

  // light rotation
  rotateLight.matrix = glm.rotateY(timeInMilliseconds*0.05);

  root.render(context);

  //animate
  requestAnimationFrame(render);
}

function convertDegreeToRadians(degree) {
  return degree * Math.PI / 180
}

var tmplight, tmplight2;
function initGUI(){

  var gui = new dat.GUI();
  var flight = createGuiLightFolder(gui,light,'light');
  var fC3poMaterial = createGuiMaterialFolder(gui,c3po,'c3po Material');
  var fFloorMaterial = createGuiMaterialFolder(gui,floor,'floor Material');

  let tmpModel = function(){}; tmpModel.children = Object.keys(models)[0];
  gui.add( tmpModel, 'children', Object.keys(models) ).onChange(function(value){
    c3po.children = models[value];
  });

  gui.closed = true; // close gui to avoid using up too much screen

}

function createGuiLightFolder(gui,light,name){
  let tmplight = new LightSGNode(light);
  tmplight.ambient = light.ambient.map(function(x){ return x*255; });
  tmplight.diffuse = light.diffuse.map(function(x){ return x*255; });
  tmplight.specular = light.specular.map(function(x){ return x*255; });
  let flight = gui.addFolder(name);
  flight.addColor(tmplight, 'diffuse').onChange(function(value){
    light.diffuse = value.map(function(x){ return x/255; });
  });
  flight.addColor(tmplight, 'specular').onChange(function(value){
    light.specular = value.map(function(x){ return x/255; });
  });
  flight.addColor(tmplight, 'ambient').onChange(function(value){
    light.ambient = value.map(function(x){ return x/255; });
  });
  tmplight.position = light.position.toString();
  flight.add(tmplight, 'position').onChange(function(value){
    light.position = JSON.parse("[" + value + "]");
  });
  return flight;
}

function createGuiMaterialFolder(gui,material,name){
  let tmpmaterial = function(){}; // empty object
  tmpmaterial.ambient = material.ambient.map(function(x){ return x*255; });
  tmpmaterial.diffuse = material.diffuse.map(function(x){ return x*255; });
  tmpmaterial.specular = material.specular.map(function(x){ return x*255; });
  tmpmaterial.emission = material.emission.map(function(x){ return x*255; });
  let folder = gui.addFolder(name);
  folder.addColor(tmpmaterial, 'diffuse').onChange(function(value){
    material.diffuse = value.map(function(x){ return x/255; });
  });
  folder.addColor(tmpmaterial, 'specular').onChange(function(value){
    material.specular = value.map(function(x){ return x/255; });
  });
  folder.addColor(tmpmaterial, 'ambient').onChange(function(value){
    material.ambient = value.map(function(x){ return x/255; });
  });
  folder.addColor(tmpmaterial, 'emission').onChange(function(value){
    material.emission = value.map(function(x){ return x/255; });
  });
  folder.add(material,'shininess', 0,100); // = 0.0;
  return folder;
}
