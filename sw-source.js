importScripts('/third_party/workbox_202/workbox-sw.prod.v2.1.2.js');
importScripts('/third_party/workbox_202/workbox-background-sync.prod.v2.0.3.js');
importScripts('/third_party/workbox_202/workbox-routing.prod.v2.1.0.js');


/**
 * DO NOT EDIT THE FILE MANIFEST ENTRY
 *
 * The method precache() does the following:
 * 1. Cache URLs in the manifest to a local cache.
 * 2. When a network request is made for any of these URLs the response
 *    will ALWAYS comes from the cache, NEVER the network.
 * 3. When the service worker changes ONLY assets with a revision change are
 *    updated, old cache entries are left as is.
 *
 * By changing the file manifest manually, your users may end up not receiving
 * new versions of files because the revision hasn't changed.
 *
 * Please use workbox-build or some other tool / approach to generate the file
 * manifest which accounts for changes to local files and update the revision
 * accordingly.
 */

const workboxSW = new self.WorkboxSW({
  "skipWaiting": true,
  "clientsClaim": true
});
workboxSW.precache([]);

// Create a background sync queue plugin, which automatically adds
// failed requests to a background sync queue.
const queuePlugin = new workbox.backgroundSync.QueuePlugin({
  callbacks: {
    replayDidSucceed: async(hash, res) => {
      send_message_to_all_clients(res.url);
    },
    replayDidFail: (hash) => {console.log("Replay did fail")},
    requestWillEnqueue: (reqData) => {reqData.request.mode ='cors', reqData.request.credentials = 'omit', console.log("Replay will Enqueue")},
    requestWillDequeue: (reqData) => {reqData.request.mode ='cors', reqData.request.credentials = 'omit', console.log("Replay will Dequeue")},
  },
});

function send_message_to_client(client, msg){
  return new Promise(function(resolve, reject){
      var msg_chan = new MessageChannel();

      msg_chan.port1.onmessage = function(event){
          if(event.data.error){
              reject(event.data.error);
          }else{
              resolve(event.data);
          }
      };
      client.postMessage(msg, [msg_chan.port2]);
  });
}

function send_message_to_all_clients(msg){
  clients.matchAll().then(clients => {
      clients.forEach(client => {
          send_message_to_client(client, msg).then(m => console.log("SW Received Message: "+m));
      })
  })
};

//Automatically replay all queued request when new request
workboxSW.router.registerRoute('https://node-hnapi.herokuapp.com/', () => {
  return queuePlugin.replayRequests().then(() => {
    return fetch('https://node-hnapi.herokuapp.com/');
  }).catch(err => {
    return err;
  });
});

// Add the route to the default router.
workboxSW.router.registerRoute(/https:\/\/node-hnapi.herokuapp.com\//, workboxSW.strategies.networkFirst({plugins: [queuePlugin], cacheableResponse: {statuses: [0, 200]}}), 'GET');
workboxSW.router.registerRoute(/manifest.json/, workboxSW.strategies.networkFirst({}), 'GET');
workboxSW.router.registerRoute(/https:\/\/sapui5.hana.ondemand.com\/resources\//, workboxSW.strategies.staleWhileRevalidate({}), 'GET');