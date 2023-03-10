import {CGFapplication} from '../lib/CGF.js';
import {XMLscene} from './XMLscene.js';
import {MyInterface} from './MyInterface.js';
import {MySceneGraph} from './MySceneGraph.js';

function getUrllets() {
    const lets = {};
    const parts = window.location.href.replace(
        /[?&]+([^=&]+)=([^&]*)/gi,
        function(m, key, value) {
            lets[decodeURIComponent(key)] = decodeURIComponent(value);
        }
    );
    return lets;
}

function main() {
    // Standard application, scene and interface setup
    const app = new CGFapplication(document.body);
    const myInterface = new MyInterface();
    const myScene = new XMLscene(myInterface);

    app.init();

    app.setScene(myScene);
    app.setInterface(myInterface);

    myInterface.setActiveCamera(myScene.camera);

    // get file name provided in URL, e.g. http://localhost/myproj/?file=myfile.xml

    const filename = getUrllets()['file'] || 'space.xml';

    // create and load graph, and associate it to scene.
    // Check console for loading errors
    const myGraph = new MySceneGraph(filename, myScene);

    // start
    app.run();
}

main();
