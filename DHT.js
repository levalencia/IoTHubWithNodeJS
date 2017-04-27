/*Modulo para procesar las lecturas de Temperatura y Humedad Ambiente usando sensor DHT11-22*/

//Modulos internos
var util = require("util"),EventEmitter = require("events").EventEmitter;
var sensorDHT = require('node-dht-sensor');

//Inicializador del modulo
exports.init = function (){
    return new DHT();
}
//Constructor
function DHT(){
    EventEmitter.call(this);
}
//Herencia para eventos
util.inherits(DHT, EventEmitter);


//Variables globales
var tipoSensor = 22;
var pinLectura = 4;
//Configuracion inicial
DHT.prototype.configurar = function(pin, tipo){
	tipoSensor = tipo;
	pinLectura = pin;
	console.log("Inicializado sensor DHT"+tipoSensor+" en PIN "+pinLectura);
}
//Lectura 
DHT.prototype.read = function(){
	var self = this;
	sensorDHT.read(tipoSensor, pinLectura, function(err, temperature, humidity) {
		if (!err) {
			self.emit("readyTempAm",temperature.toFixed(1));
			self.emit("readyHumAm",humidity.toFixed(1));
		}else{
		  self.emit("errTHAm",err);
		}
		
	});
}

module.exports.DHT = DHT;
