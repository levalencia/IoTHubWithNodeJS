/*Modulo principal para gestion y configuracion de parametros para lectura
de temperatura y humedad-Eventos relacionados*/

//Modulos internos
var gpio = require("pi-gpio");
const fs = require('graceful-fs');
const co = require('co');
//Modulos propios 
var controSens = require('./ControlTemperApp').init();
var BMP180Cy = require('./BMP180Cylon').init();
var TCA9548Am = require('./TCA9548A').init();
var DHTm = require('./DHT').init();
var IoTHubm = require('./IoTHub').init();
var Servm = require("./Server").init();
var config = require('./config.json');
//Constantes
const waitTime = 3000; 
const addressBMP = 0x77;
const numChan = 8;
const numMux = config.nummuxes;
const rst = config.pinresetmux;
const lectsens = 5000;
const bmpreint = 20000;
const periodo = 2;
//Variables globales
var context = TCA9548Am.getContex();
var status = "start";
var indexMux = 0;
var indexChan = 0;
var statusRobot = false;
var clave;
var semiot = true;
//Arregos de configuración
var temperatura = config.dispositivos.temperatura.list;
var tempAmb = config.dispositivos.tempAmb.list;
var humAmb = config.dispositivos.humAmb.list;

//Event 
TCA9548Am.on("readyChan",function(context){
	context.scan(function(err,data){	
		if(!err){
			data.some(function(entry) {	
				if(entry === addressBMP){	
				    status = "run";	
					BMP180Cy.readDevice();
					return;
				}else{
					status = "reint";
				}
			});
		}else{	
			status = "reint";
		}		
	});
	
});

//Event 
TCA9548Am.on("errorChan",function(err){
	console.log(err);
	status = "reint";
	writeFile("./log.txt",geDataNaw()+":"+err);
});

//Event 
BMP180Cy.on("errRob",function(err){
	console.log(err);
	status = "reint";
	writeFile("./log.txt",geDataNaw()+":"+err);
});

//Event 
BMP180Cy.on("readyTemp",function(tempera){	
	var device = temperatura[numChan*indexMux+indexChan];
	if(device){
		controSens.setTemperatura(tempera,device.nombre);
    }
	console.log("Mux:["+indexMux+"]-Canal:["+indexChan+"] -> "+tempera+" °C");
	if(numMux !== 0){next(false,readChanel);}
});

//Event 
BMP180Cy.on("errorTemp",function(err){	
	console.log(err);
    status = "reint";
	writeFile("./log.txt",geDataNaw()+":"+err);
});

//Event 
DHTm.on("readyTempAm",function(tempAm){
	if(tempAmb[0]){
		controSens.setTemperaturaAmb(tempAm,tempAmb[0].nombre);
    }
	console.log("TemperaturaAm: "+tempAm + " °C");
});

//Event 
DHTm.on("readyHumAm",function(humAm){
	if(humAmb[0]){
		controSens.setHumedadAmb(humAm,humAmb[0].nombre);
    }
	console.log("HumedadAm: "+humAm + "%");
});

//Event 
DHTm.on("errTHAm",function(err){
	console.log(err);
	writeFile("./log.txt",geDataNaw()+":"+err);
});

//Event 
IoTHubm.on("errIoT",function(err){
	console.log(err);
	writeFile("./log.txt",geDataNaw()+":"+err);
});

//Event 
IoTHubm.on("readyIoT",function(data){
  console.log(data);
  setInterval(eventIoTHub,config.intervalo);
});

//Event 
Servm.on("userChange",function(data){
  clave = data.index;
});

//Event 
Servm.on("userConnect",function(data){
    var values = [];
    temperatura.forEach(function(entry){								
      values.push({nombre:entry.nombre});
    });
    var msg = JSON.stringify({arrindex:values});
    clave = values[0].nombre;
    Servm.prepareclient(msg);
    setInterval(sedTempH,config.tiemporefresh);
});

//Reporte de datos a IoT Hub de Azure
function eventIoTHub(){
	if(!semiot)
		return;
		
	semiot = false;

	co(function*(){
		try{
			yield function(){
				   return new Promise(function(filfull,reject){
					    if(temperatura.length === 0){
							filfull({valor:"err"});
						}else{
							temperatura.forEach(co.wrap(function* (entry,index,array){
			
								var temp = controSens.getTemperatura(entry.nombre);
								if(temp){
									var data = JSON.stringify({
										deviceId: entry.id,
										valor: temp,
										fecha: geDataNaw()
									});
									yield IoTHubm.sendEvent(data);
							   }
							   
							   if(index === array.length-1){
								   filfull({valor:"ok"});
							   }
						}));
				    }
				});		
			}();
			//
			yield function(){
				 return new Promise(function(filfull,reject){
					if(tempAmb.length === 0){
					  	filfull({valor:"err"});
					}else{
						tempAmb.forEach(co.wrap(function*(entry,index,array){						

							var temp = controSens.getTemperaturaAmb(entry.nombre);
							if(temp){
								var data = JSON.stringify({
									deviceId: entry.id,
									valor: temp,
									fecha: geDataNaw()
								});
								yield IoTHubm.sendEvent(data);
							}
							if(index === array.length-1){
							   filfull({valor:"ok"});
							}
						}));
					}
				  });	
				}();	
			//
			yield function(){
				return new Promise(function(filfull,reject){
					if(humAmb.length === 0){
					  	filfull({valor:"err"});
					}else{
						humAmb.forEach(co.wrap(function*(entry,index,array){				
							var hum = controSens.getHumedadAmb(entry.nombre);
							if(hum){
								var data = JSON.stringify({
									deviceId: entry.id,
									valor: hum,
									fecha: geDataNaw()
								});
								yield IoTHubm.sendEvent(data);
							}
							if(index === array.length-1){
							   filfull({valor:"ok"});
							}
					   }));
			     }
			 });
		 }();
		}catch(err){		
			console.log(err);
		}
		semiot = true;
	});

}

//Reporte de datos a servidor local
function sedTempH(){
	var claveTem = "";
	var claveHum= "";
	if(tempAmb[0]){
		claveTem = tempAmb[0].nombre;
    }
    if(humAmb[0]){
		claveHum = humAmb[0].nombre;
    }
   Servm.sendtoclient({temperatura:controSens.getTemperatura(clave),titulotemp:"Temperatura-"+clave,temperAmbiente:controSens.getTemperaturaAmb(claveTem),humedadAmbiente:controSens.getHumedadAmb(claveHum)});
}

//Lectura de temperatura y humedad ambiente
function readDht(){
	if(tempAmb[0] && humAmb[0]){
		DHTm.read();
	}
}

//Reintentos para lecturas I2C
function reinti2c(){
	console.log(".");
	next(false,readChanel);
}

//Configuracion del canal en Multiplexor I2C
function readChanel(){	
	if(temperatura[indexChan] != null){
		TCA9548Am.activeChanel(indexMux,indexChan);      
	}
}
//Lecturs para solo un BMP
function readOnlyBPM(){
	if(temperatura[0] != null){
		if(statusRobot){
			BMP180Cy.readDevice();
		}else{
			initRobot();
		}
	}
}
//Inicio del robot de temperatura en puerto I2C
function initRobot(){
	statusRobot = BMP180Cy.readyRobotBMP180();
	if(!statusRobot){
		context.scan(function(err, data) {
			if(!err){
				data.some(function(entry) {	
					if(	entry === addressBMP){
						BMP180Cy.initRobot();
						return;
					}					
				});
			}
			if(numMux === 0){
			   setTimeout(readOnlyBPM, waitTime);
			}else{
			   setTimeout(readChanel, waitTime);
			}
		});	   
	}
}

//Escritura en pines GPIO
function writeGPIO(pin,opcion,callback){
	gpio.write(pin, opcion, function(err) {
	  if(err){
		console.log(err);
		callback(err);	
		writeFile("./log.txt",geDataNaw()+":"+err);		    
	  }		
	   callback(null);			    
	});
}

//Inicio de puertos GPIO
function initGPIO(pin,opcion,callback){
	gpio.close(pin,function(err){
		console.log(err);
		gpio.open(pin, opcion, function(err){
		   if(err){
			 console.log(err);	
			 callback(err);	
			 writeFile("./log.txt",geDataNaw()+":"+err);		    
		   }		
		  callback(null);			    
		});
	});
}

//Obtener hora y fecha actual
function geDataNaw(){

	var fecha = new Date();
    var fechaHora = fecha.getDate() + "/" + (fecha.getMonth()+1) + "/" + fecha.getFullYear() +' '+fecha.getHours() +':'+ fecha.getMinutes() +':'+ fecha.getSeconds();

	return fechaHora;
}

//Se obtiene configuracion para lectura en cada canal del Multiplexor I2C
function next(restart,callback){
	
	var reset = false;
	if(restart){		
	  indexChan = 0;
	  indexMux = 0;	  
	  return;
	}
	
	indexChan++;
	if(indexChan >= numChan){
		indexChan = 0;
		indexMux++;
		reset = true;
		writeGPIO(rst,0,function(err){
			writeGPIO(rst,1,function(err){
				callback(); 
			});
			
		});
	}
	
	if(indexMux >= numMux){
	  indexMux = 0;
	}
	
	if(!reset)
	 callback();
}

//Escritura de daltos en archivo LOG
function writeFile (path,data){
	var file = fs.createWriteStream(path,{flags:'a'});
	file.write(data+'\r\n');
	file.end();
}

//Captura global de excepciones
process.on("uncaughtException", function(err) {
  console.log("Caught exception: " + err);
  status = "reint";
  writeFile("./log.txt",geDataNaw()+":Caught exception->"+err);
});
process.on('exit', function (){
  writeFile("./log.txt",geDataNaw()+": Exit to aplication");
});
process.setMaxListeners(0);
//-----------------------------------------
//Evento periodico que evalua estados del proceso de lecturas
every((periodo).seconds(),function(){

	switch(status){
		case "start":
			status = "run";
			Servm.startserver(config.puerto);
			DHTm.configurar(config.pindht,config.tipodht);
			setInterval(readDht,lectsens);
			IoTHubm.createClient(config.conectionString,config.linktestinternet);
			IoTHubm.openConnection();
			if(numMux === 0){
				initRobot();
				setInterval(readOnlyBPM,lectsens);
			}else{
				setInterval(reinti2c,bmpreint);
				initGPIO(rst,"output",function(){
					writeGPIO(rst,1,function(){
					  initRobot();
					  if(statusRobot)
						readChanel();
					});
				});
			}
		break;		
		case "reint":
			status = "run";
			if(numMux !== 0){
				next(false,function(){
				   initRobot();		 
				   if(statusRobot)
					 readChanel();
				});
			}
		break;		
	}	
});

