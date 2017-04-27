/*Modulo para la gestion y envio de mensajes al IoT Hub de Azure*/ 

//Modulos internos
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var util = require("util"),EventEmitter = require("events").EventEmitter;
var dns = require('dns');
var Message = require('azure-iot-common').Message;

//Inicializador del modulo
exports.init = function (){
    return new IoTHub();
}
//Constructor
function IoTHub(){
    EventEmitter.call(this);
}
//Herencia para eventos
util.inherits(IoTHub, EventEmitter);

//Variables globales
var client;
var linkTestInternet;

//Creacion de cliente azure IoT
IoTHub.prototype.createClient  = function (connectionString,linktestI){
	linkTestInternet = linktestI;
	client = clientFromConnectionString(connectionString);
}
 
//Apertura de coneccion
IoTHub.prototype.openConnection = function(){
	self = this;
 	client.open(function(err){  
 	    if (err) {
			self.emit("errIoT",err);
		} else {
			self.emit("readyIoT","Client azure connected");
		}
		
	});
}
//Envio de mensajes
IoTHub.prototype.sendEvent = function(data){
	self = this;
    return new Promise(function(fulfill,reject){

		var msg = new Message(data);
		client.sendEvent(msg, function (err) {
		  if (err) {
			self.emit("errIoT",err);
			fulfill({valor:"Error"});		
		  } else {
			self.emit("readySendIoT","Message sent");
			fulfill({valor:"ok"});		
		  };
		});	
									
		waitSeg(10,function(){
			fulfill({valor:"Timeout"});		
		});
	});
	
}
//Funcion de timeout
function waitSeg(timeWait,callback){
  var N=0;
  var hilo = setInterval(function(){
    if(N>=timeWait){
      callback();
      clearInterval(hilo);
    }
    N++;
  },1000);

}

module.exports.IoTHub = IoTHub;

