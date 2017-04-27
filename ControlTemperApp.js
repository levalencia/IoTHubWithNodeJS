/*Modulo que funciona como buffer para las lecturas de los sensores*/

//Modulos internos
var util = require("util"),EventEmitter = require("events").EventEmitter;

//Inicializador del modulo
exports.init = function (){
    return new ControlTemp();
}
//Constructor
function ControlTemp(){
    EventEmitter.call(this);
}
//Herencia para eventos
util.inherits(ControlTemp, EventEmitter);

//Variables globales
var temperatura = new Object();
var temperaturaAmbiente = new Object();
var humdadAmbiente = new Object();

//Geters
ControlTemp.prototype.getTemperatura = function (clave){

	return temperatura[clave];
}
ControlTemp.prototype.getTemperaturaAmb = function (clave){

	return temperaturaAmbiente[clave];
}
ControlTemp.prototype.getHumedadAmb = function (clave){

	return humdadAmbiente[clave];
}

//Seters
ControlTemp.prototype.setTemperatura = function (valor,clave){

	temperatura[clave] = valor;	
}

ControlTemp.prototype.setTemperaturaAmb = function (valor,clave){

	temperaturaAmbiente[clave] = valor;	
}

ControlTemp.prototype.setHumedadAmb = function (valor,clave){

	humdadAmbiente[clave] = valor;	
}

