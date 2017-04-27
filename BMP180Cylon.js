/*Modulo Cylon I2C-Robot para lecturas de temperatura usando el sensor BMP180*/
//Modulos internos
var util = require("util"),EventEmitter = require("events").EventEmitter;
var Cylon = require('cylon');

//Inicializador del modulo
exports.init = function (){
    return new BMP180();
}

//Constructor
function BMP180(){
    EventEmitter.call(this);
}

//Herencia para eventos
util.inherits(BMP180, EventEmitter);
//Variables globales
var robot;
var bmp180device;
var readyRobotBMP180 = false;

//Inicializador de Robot desde afuera del modulo
BMP180.prototype.initRobot = function(){	
	//every((tiempo).seconds(),initRobotBMP);
	initRobotBMP();
}
//Inicia robot
function initRobotBMP(){
	
	if(!readyRobotBMP180){
		readyRobotBMP180 = false;
		robot = Cylon.robot({
		connections: {
			raspi: { adaptor: 'raspi' }
		},

		devices: {
			bmp180: { driver: 'bmp180' }
		},

		work: function(device) {
			bmp180device = device;
			readyRobotBMP180 = true;
			console.log("Inicializado el robot de tempertura");
		}
		}).start();	
	}
}

//Lectura de temperatura	
BMP180.prototype.readDevice = function (){
	var self = this;
	if(bmp180device){
		bmp180device.bmp180.start(function (){
			bmp180device.bmp180.getTemperature(function(err, val) {
				if (err) {
					self.emit("errorTemp",err);
					return;
				}
				var temperatura = val.temp;

				self.emit("readyTemp",temperatura);

			});
	    });			
	}else{
		self.emit("errRob","No inicializado el robot de tempertura");
	}
}

//Obtiene estado del robot
BMP180.prototype.readyRobotBMP180 = function(){ 
	return readyRobotBMP180;
}


module.exports.BMP180 = BMP180;
