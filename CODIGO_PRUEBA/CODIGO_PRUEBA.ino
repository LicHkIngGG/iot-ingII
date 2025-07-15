/*
 * ESP32 + WIZnet W5500 - Sistema de Alumbrado Inteligente
 * VERSIÓN SIMPLIFICADA - Compatible con ESP32 Core v3.x
 * Sensores: LDR, PIR, ACS712, Control LED PWM
 * Comunicación: HTTP REST API + JSON
 */

#include <SPI.h>
#include <Ethernet.h>
#include <ArduinoJson.h>
#include <EEPROM.h>

// ===== CONFIGURACIÓN DE HARDWARE =====
#define LED_PIN 2
#define LDR_PIN 34
#define PIR_PIN 4
#define ACS712_PIN 35
#define WIZNET_CS_PIN 5
#define WIZNET_RST_PIN 14

// Configuración PWM
#define LED_FREQ 5000
#define LED_RESOLUTION 8

// ===== CONFIGURACIÓN DE RED =====
byte mac[] = {0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED};
IPAddress ip(192, 168, 1, 150);
IPAddress gateway(192, 168, 1, 150);
IPAddress subnet(255, 255, 255, 0);
IPAddress dns(8, 8, 8, 8);

EthernetServer httpServer(80);

// ===== VARIABLES GLOBALES =====
String deviceId = "POSTE_001";
String deviceName = "Poste Villa Adela Norte 001";
String firmwareVersion = "2.1.0";

int ledIntensity = 0;
bool ledState = false;
bool ledManualMode = false;

struct SensorData {
  int ldrRaw = 0;
  float luxCalculated = 0;
  bool ldrFunctioning = true;
  
  bool pirDetection = false;
  bool pirLastState = false;
  unsigned long pirLastDetection = 0;
  int pirCounterToday = 0;
  int pirCounterTotal = 0;
  bool pirFunctioning = true;
  
  int acs712Raw = 0;
  float currentAmps = 0;
  float powerWatts = 0;
  bool acs712Functioning = true;
  
  float consumptionToday = 0;
  float costToday = 0;
  int timeOnToday = 0;
  int switchesOnToday = 0;
  float efficiencyToday = 85.2;
} sensors;

struct SensorConfig {
  bool ldrEnabled = true;
  int ldrThresholdOn = 100;
  int ldrThresholdOff = 300;
  float ldrCalibrationFactor = 1.0;
  int ldrNoiseFilter = 5;
  
  bool pirEnabled = true;
  int pirSensitivity = 2;
  int pirActivationTime = 30;
  int pirDetectionRange = 5;
  int pirReadDelay = 2;
  
  bool acs712Enabled = true;
  String acs712Model = "20A";
  float acs712RefVoltage = 2.5;
  int acs712Sensitivity = 100;
  int acs712FilterAverage = 10;
  float acs712MaxAlert = 20.0;
  
  int fastReadingInterval = 1000;
  int normalReadingInterval = 5000;
  int webAppSendInterval = 30000;
} config;

struct AutomationConfig {
  bool enabled = true;
  String mode = "inteligente";
  bool ldrAutomatic = true;
  bool pirAutomatic = true;
  bool fixedSchedule = false;
  bool overrideManual = false;
  
  bool scheduleEnabled = true;
  String forcedOnTime = "18:00";
  String forcedOffTime = "06:00";
  bool nightDimmerEnabled = false;
  String nightDimmerTime = "22:00";
  int nightDimmerIntensity = 60;
} automation;

unsigned long lastSensorRead = 0;
unsigned long lastWebSend = 0;
unsigned long lastPirCheck = 0;
unsigned long bootTime = 0;
unsigned long dailyResetTime = 0;

#define EEPROM_SIZE 512
#define EEPROM_IP_ADDR 0
#define EEPROM_CONFIG_ADDR 20
#define EEPROM_MAGIC_ADDR 100
#define EEPROM_MAGIC_VALUE 0xAB

bool scheduleRestart = false;
unsigned long restartTime = 0;

// ===== DECLARACIONES DE FUNCIONES =====
String createJSONResponse(String json);
String createErrorResponse(String error, int statusCode = 400);
String createCORSResponse();

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("=== ESP32 Alumbrado Inteligente v2.1.0 ===");
  Serial.println("Inicializando sistema...");
  
  EEPROM.begin(EEPROM_SIZE);
  loadConfiguration();
  
  setupPins();
  testAllSensors();
  setupLEDPWM();
  startupLEDSequence();
  setupEthernet();
  
  httpServer.begin();
  
  bootTime = millis();
  dailyResetTime = millis();
  
  Serial.println("🎉 SISTEMA LISTO!");
  Serial.println("📍 Device ID: " + deviceId);
  Serial.println("📡 IP: " + ip.toString());
  Serial.println("🌐 Servidor: http://" + ip.toString());
  Serial.println("=======================================");
  
  // Mostrar info de testing CORS
  printCORSTest();
}

// ===== LOOP PRINCIPAL =====
void loop() {
  unsigned long currentTime = millis();
  
  if (scheduleRestart && currentTime >= restartTime) {
    Serial.println("🔄 REINICIANDO CON NUEVA CONFIGURACIÓN...");
    delay(1000);
    ESP.restart();
  }
  
  Ethernet.maintain();
  handleHTTPClients();
  
  if (currentTime - lastSensorRead >= config.normalReadingInterval) {
    readAllSensors();
    lastSensorRead = currentTime;
  }
  
  processAutomation();
  
  if (currentTime - lastWebSend >= config.webAppSendInterval) {
    sendDataToWebApp();
    lastWebSend = currentTime;
  }
  
  if (currentTime - dailyResetTime >= 86400000) {
    resetDailyCounters();
    dailyResetTime = currentTime;
  }
  
  static unsigned long lastStatus = 0;
  if (currentTime - lastStatus > 30000) {
    printStatus();
    lastStatus = currentTime;
  }
  
  delay(100);
}

// ===== CONFIGURACIÓN DE HARDWARE =====
void setupPins() {
  pinMode(LED_PIN, OUTPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(ACS712_PIN, INPUT);
  
  if (WIZNET_RST_PIN > 0) {
    pinMode(WIZNET_RST_PIN, OUTPUT);
    digitalWrite(WIZNET_RST_PIN, HIGH);
  }
  
  digitalWrite(LED_PIN, LOW);
  Serial.println("✅ Pines configurados");
}

void setupLEDPWM() {
  Serial.println("💡 Configurando PWM LED...");
  
  // MÉTODO MÁS SIMPLE - Solo usar ledcAttach
  if (ledcAttach(LED_PIN, LED_FREQ, LED_RESOLUTION)) {
    Serial.println("✅ PWM configurado con ledcAttach");
  } else {
    Serial.println("❌ Error configurando PWM con ledcAttach");
    Serial.println("⚠️ Intentando configuración básica...");
    
    // Configuración más básica
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
  }
  
  setLEDIntensityDirect(0);
  Serial.println("✅ PWM LED listo");
}

void setupEthernet() {
  Serial.println("🌐 Inicializando Ethernet...");
  
  if (WIZNET_RST_PIN > 0) {
    digitalWrite(WIZNET_RST_PIN, LOW);
    delay(100);
    digitalWrite(WIZNET_RST_PIN, HIGH);
    delay(500);
  }
  
  Ethernet.init(WIZNET_CS_PIN);
  Ethernet.begin(mac, ip, dns, gateway, subnet);
  
  if (Ethernet.hardwareStatus() == EthernetNoHardware) {
    Serial.println("❌ Hardware Ethernet no detectado");
    return;
  }
  
  if (Ethernet.linkStatus() == LinkOFF) {
    Serial.println("⚠️ Cable Ethernet desconectado");
  }
  
  Serial.println("✅ Ethernet configurado");
  Serial.println("📍 IP local: " + Ethernet.localIP().toString());
}

void startupLEDSequence() {
  Serial.println("💡 Secuencia de inicio LED...");
  
  for (int i = 0; i <= 255; i += 15) {
    setLEDIntensityDirect(i);
    delay(50);
  }
  for (int i = 255; i >= 0; i -= 15) {
    setLEDIntensityDirect(i);
    delay(50);
  }
  
  for (int i = 0; i < 3; i++) {
    setLEDIntensityDirect(255);
    delay(200);
    setLEDIntensityDirect(0);
    delay(200);
  }
  
  Serial.println("✅ Secuencia completada");
}

// ===== FUNCIONES PWM =====
void setLEDIntensityDirect(int intensity) {
  intensity = constrain(intensity, 0, 255);
  
  // Intentar primero con ledcWrite, si falla usar analogWrite
  bool writeSuccess = false;
  
  // Intentar ledcWrite (ESP32 v3.x)
  if (ledcWrite(LED_PIN, intensity)) {
    writeSuccess = true;
  } else {
    // Fallback a analogWrite si ledcWrite falla
    analogWrite(LED_PIN, intensity);
    writeSuccess = true;
  }
  
  if (!writeSuccess) {
    // Último recurso: digitalWrite para on/off básico
    digitalWrite(LED_PIN, intensity > 127 ? HIGH : LOW);
  }
}

void setLEDIntensity(int intensity) {
  ledIntensity = constrain(intensity, 0, 255);
  setLEDIntensityDirect(ledIntensity);
  ledState = (ledIntensity > 0);
  
  Serial.println("💡 LED: " + String(ledIntensity) + "/255 (" + String(round((ledIntensity/255.0)*100)) + "%)");
}

// ===== UTILIDADES HTTP =====
String createJSONResponse(String json) {
  String response = "HTTP/1.1 200 OK\r\n";
  response += "Content-Type: application/json; charset=utf-8\r\n";
  response += "Access-Control-Allow-Origin: *\r\n";
  response += "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n";
  response += "Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin\r\n";
  response += "Access-Control-Max-Age: 86400\r\n";
  response += "Cache-Control: no-cache, no-store, must-revalidate\r\n";
  response += "Connection: close\r\n";
  response += "Content-Length: " + String(json.length()) + "\r\n\r\n";
  response += json;
  return response;
}

String createErrorResponse(String error, int statusCode) {
  DynamicJsonDocument doc(256);
  doc["success"] = false;
  doc["error"] = error;
  doc["statusCode"] = statusCode;
  doc["timestamp"] = millis();
  
  String json;
  serializeJson(doc, json);
  
  String statusText = "Bad Request";
  if (statusCode == 404) statusText = "Not Found";
  else if (statusCode == 500) statusText = "Internal Server Error";
  
  String response = "HTTP/1.1 " + String(statusCode) + " " + statusText + "\r\n";
  response += "Content-Type: application/json; charset=utf-8\r\n";
  response += "Access-Control-Allow-Origin: *\r\n";
  response += "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n";
  response += "Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin\r\n";
  response += "Connection: close\r\n";
  response += "Content-Length: " + String(json.length()) + "\r\n\r\n";
  response += json;
  return response;
}

String createCORSResponse() {
  String response = "HTTP/1.1 200 OK\r\n";
  response += "Access-Control-Allow-Origin: *\r\n";
  response += "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n";
  response += "Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin\r\n";
  response += "Access-Control-Max-Age: 86400\r\n";
  response += "Content-Length: 0\r\n";
  response += "Connection: close\r\n\r\n";
  return response;
}

// ===== LECTURA DE SENSORES =====
void readAllSensors() {
  readLDRSensor();
  readPIRSensor();
  readACS712Sensor();
  calculateDerivedValues();
}

void readLDRSensor() {
  if (!config.ldrEnabled) return;
  
  sensors.ldrRaw = analogRead(LDR_PIN);
  float voltage = (sensors.ldrRaw / 4095.0) * 3.3;
  sensors.luxCalculated = (voltage / 3.3) * 1000 * config.ldrCalibrationFactor;
  
  static float lastLux = 0;
  if (abs(sensors.luxCalculated - lastLux) < config.ldrNoiseFilter) {
    sensors.luxCalculated = lastLux;
  } else {
    lastLux = sensors.luxCalculated;
  }
  
  sensors.ldrFunctioning = true;
}

void readPIRSensor() {
  if (!config.pirEnabled) return;
  
  bool currentState = digitalRead(PIR_PIN);
  sensors.pirDetection = currentState;
  
  if (currentState && !sensors.pirLastState) {
    sensors.pirLastDetection = millis();
    sensors.pirCounterToday++;
    sensors.pirCounterTotal++;
    Serial.println("👁️ Movimiento detectado! Total hoy: " + String(sensors.pirCounterToday));
  }
  
  sensors.pirLastState = currentState;
  sensors.pirFunctioning = true;
}

void readACS712Sensor() {
  if (!config.acs712Enabled) return;
  
  long sum = 0;
  for (int i = 0; i < config.acs712FilterAverage; i++) {
    sum += analogRead(ACS712_PIN);
    delay(2);
  }
  
  sensors.acs712Raw = sum / config.acs712FilterAverage;
  float voltage = (sensors.acs712Raw / 4095.0) * 3.3;
  sensors.currentAmps = abs(voltage - config.acs712RefVoltage) / (config.acs712Sensitivity / 1000.0);
  
  if (sensors.currentAmps < 0.1) {
    sensors.currentAmps = 0;
  }
  
  sensors.powerWatts = sensors.currentAmps * 220.0;
  sensors.acs712Functioning = true;
}

void calculateDerivedValues() {
  static unsigned long lastCalc = 0;
  unsigned long now = millis();
  
  if (lastCalc > 0 && sensors.powerWatts > 0) {
    float hoursElapsed = (now - lastCalc) / 3600000.0;
    sensors.consumptionToday += (sensors.powerWatts / 1000.0) * hoursElapsed;
    sensors.costToday = sensors.consumptionToday * 0.80;
  }
  
  lastCalc = now;
  
  if (ledState) {
    static unsigned long onTime = 0;
    if (onTime == 0) onTime = now;
    sensors.timeOnToday = (now - onTime) / 60000;
  }
}

void testAllSensors() {
  Serial.println("🧪 Probando sensores...");
  
  int ldrTest = analogRead(LDR_PIN);
  Serial.println("📊 LDR: " + String(ldrTest) + " (raw)");
  
  bool pirTest = digitalRead(PIR_PIN);
  Serial.println("👁️ PIR: " + String(pirTest ? "Activado" : "Inactivo"));
  
  int acsTest = analogRead(ACS712_PIN);
  Serial.println("⚡ ACS712: " + String(acsTest) + " (raw)");
  
  Serial.println("✅ Tests completados");
}

// ===== AUTOMATIZACIÓN =====
void processAutomation() {
  if (!automation.enabled || ledManualMode) return;
  
  bool shouldTurnOn = false;
  bool shouldTurnOff = false;
  
  if (automation.ldrAutomatic && config.ldrEnabled) {
    if (sensors.luxCalculated < config.ldrThresholdOn && !ledState) {
      shouldTurnOn = true;
      Serial.println("🌙 LDR: Luz baja detectada (" + String(sensors.luxCalculated) + " lux)");
    } else if (sensors.luxCalculated > config.ldrThresholdOff && ledState) {
      shouldTurnOff = true;
      Serial.println("☀️ LDR: Luz alta detectada (" + String(sensors.luxCalculated) + " lux)");
    }
  }
  
  if (automation.pirAutomatic && config.pirEnabled) {
    if (sensors.pirDetection && !ledState && sensors.luxCalculated < config.ldrThresholdOn) {
      shouldTurnOn = true;
      Serial.println("👁️ PIR: Movimiento detectado en oscuridad");
    }
  }
  
  if (shouldTurnOn) {
    setLEDIntensity(255);
    sensors.switchesOnToday++;
  } else if (shouldTurnOff) {
    setLEDIntensity(0);
  }
}

// ===== CONFIGURACIÓN EEPROM =====
void loadConfiguration() {
  if (EEPROM.read(EEPROM_MAGIC_ADDR) == EEPROM_MAGIC_VALUE) {
    Serial.println("📁 Cargando configuración guardada...");
    
    for (int i = 0; i < 4; i++) {
      ip[i] = EEPROM.read(EEPROM_IP_ADDR + i);
    }
    
    config.ldrThresholdOn = EEPROM.read(EEPROM_CONFIG_ADDR) + (EEPROM.read(EEPROM_CONFIG_ADDR + 1) << 8);
    config.ldrThresholdOff = EEPROM.read(EEPROM_CONFIG_ADDR + 2) + (EEPROM.read(EEPROM_CONFIG_ADDR + 3) << 8);
    
    Serial.println("✅ Configuración cargada - IP: " + ip.toString());
  } else {
    Serial.println("📝 Usando configuración por defecto");
  }
}

void saveConfiguration() {
  Serial.println("💾 Guardando configuración...");
  
  for (int i = 0; i < 4; i++) {
    EEPROM.write(EEPROM_IP_ADDR + i, ip[i]);
  }
  
  EEPROM.write(EEPROM_CONFIG_ADDR, config.ldrThresholdOn & 0xFF);
  EEPROM.write(EEPROM_CONFIG_ADDR + 1, (config.ldrThresholdOn >> 8) & 0xFF);
  EEPROM.write(EEPROM_CONFIG_ADDR + 2, config.ldrThresholdOff & 0xFF);
  EEPROM.write(EEPROM_CONFIG_ADDR + 3, (config.ldrThresholdOff >> 8) & 0xFF);
  
  EEPROM.write(EEPROM_MAGIC_ADDR, EEPROM_MAGIC_VALUE);
  EEPROM.commit();
  
  Serial.println("✅ Configuración guardada");
}

// ===== HTTP SERVER =====
void handleHTTPClients() {
  EthernetClient client = httpServer.available();
  if (client) {
    handleHTTPRequest(client);
  }
}

void handleHTTPRequest(EthernetClient &client) {
  Serial.println("🔗 Cliente conectado: " + client.remoteIP().toString());
  
  String request = "";
  String body = "";
  String method = "";
  String path = "";
  
  // Leer request completo
  unsigned long timeout = millis() + 5000;
  while (client.connected() && millis() < timeout) {
    if (client.available()) {
      String line = client.readStringUntil('\n');
      request += line + "\n";
      
      // Extraer método y path de la primera línea
      if (method == "" && line.length() > 0) {
        int firstSpace = line.indexOf(' ');
        int secondSpace = line.indexOf(' ', firstSpace + 1);
        if (firstSpace > 0 && secondSpace > firstSpace) {
          method = line.substring(0, firstSpace);
          path = line.substring(firstSpace + 1, secondSpace);
          Serial.println("📥 " + method + " " + path);
        }
      }
      
      if (line.length() <= 1) {
        // Headers terminados, leer body si es POST
        if (method == "POST") {
          int contentStart = request.indexOf("Content-Length:");
          if (contentStart >= 0) {
            int lineEnd = request.indexOf('\n', contentStart);
            String lengthStr = request.substring(contentStart + 15, lineEnd);
            lengthStr.trim();
            int contentLength = lengthStr.toInt();
            
            if (contentLength > 0 && contentLength < 2048) {
              for (int i = 0; i < contentLength && client.available(); i++) {
                body += (char)client.read();
              }
              Serial.println("📄 Body recibido: " + body);
            }
          }
        }
        break;
      }
    }
  }
  
  String response = "";
  
  // IMPORTANTE: Manejar OPTIONS primero para CORS preflight
  if (method == "OPTIONS") {
    Serial.println("🔀 Manejo de preflight CORS (OPTIONS)");
    response = createCORSResponse();
  }
  else if (path == "/api/status" && method == "GET") {
    Serial.println("📊 Manejando /api/status");
    response = handleStatusRequest();
  }
  else if (path == "/api/led" && method == "POST") {
    Serial.println("💡 Manejando /api/led");
    response = handleLEDRequest(body);
  }
  else if (path == "/api/config" && method == "POST") {
    Serial.println("⚙️ Manejando /api/config");
    response = handleConfigRequest(body);
  }
  else if (path == "/api/sensors" && method == "POST") {
    Serial.println("🔬 Manejando /api/sensors");
    response = handleSensorsRequest(body);
  }
  else if (path == "/api/automation" && method == "POST") {
    Serial.println("🤖 Manejando /api/automation");
    response = handleAutomationRequest(body);
  }
  else if (path == "/api/info" && method == "GET") {
    Serial.println("ℹ️ Manejando /api/info");
    response = handleInfoRequest();
  }
  else if (path == "/" && method == "GET") {
    Serial.println("🌐 Manejando página web");
    response = createWebPage();
  }
  else {
    Serial.println("❌ Endpoint no encontrado: " + method + " " + path);
    response = createErrorResponse("404 - Endpoint no encontrado", 404);
  }
  
  // Enviar respuesta
  client.print(response);
  client.flush();  // Asegurar que se envíe completamente
  delay(100);
  client.stop();
  
  Serial.println("✅ Respuesta enviada y cliente desconectado");
}

// ===== HANDLERS HTTP =====
String handleStatusRequest() {
  DynamicJsonDocument doc(1024);
  
  doc["type"] = "sensorData";
  doc["deviceId"] = deviceId;
  doc["deviceName"] = deviceName;
  doc["firmwareVersion"] = firmwareVersion;
  doc["ip"] = ip.toString();
  doc["uptime"] = (millis() - bootTime) / 1000;
  doc["timestamp"] = millis();
  
  doc["ledIntensity"] = ledIntensity;
  doc["ledState"] = ledState;
  doc["ledManualMode"] = ledManualMode;
  
  JsonObject sensorsObj = doc.createNestedObject("sensors");
  
  JsonObject ldr = sensorsObj.createNestedObject("ldr");
  ldr["raw"] = sensors.ldrRaw;
  ldr["lux"] = sensors.luxCalculated;
  ldr["functioning"] = sensors.ldrFunctioning;
  
  JsonObject pir = sensorsObj.createNestedObject("pir");
  pir["detection"] = sensors.pirDetection;
  pir["lastDetection"] = sensors.pirLastDetection;
  pir["counterToday"] = sensors.pirCounterToday;
  pir["counterTotal"] = sensors.pirCounterTotal;
  pir["functioning"] = sensors.pirFunctioning;
  
  JsonObject acs = sensorsObj.createNestedObject("acs712");
  acs["raw"] = sensors.acs712Raw;
  acs["current"] = sensors.currentAmps;
  acs["power"] = sensors.powerWatts;
  acs["functioning"] = sensors.acs712Functioning;
  
  JsonObject calc = doc.createNestedObject("calculated");
  calc["consumptionToday"] = sensors.consumptionToday;
  calc["costToday"] = sensors.costToday;
  calc["timeOnToday"] = sensors.timeOnToday;
  calc["switchesOnToday"] = sensors.switchesOnToday;
  calc["efficiencyToday"] = sensors.efficiencyToday;
  
  doc["linkStatus"] = (Ethernet.linkStatus() == LinkON) ? "connected" : "disconnected";
  doc["freeHeap"] = ESP.getFreeHeap();
  
  String json;
  serializeJson(doc, json);
  
  return createJSONResponse(json);
}

String handleLEDRequest(String body) {
  DynamicJsonDocument doc(256);
  
  if (!deserializeJson(doc, body)) {
    if (doc.containsKey("intensity")) {
      int intensity = doc["intensity"];
      ledManualMode = doc["manual"] | true;
      
      setLEDIntensity(intensity);
      
      DynamicJsonDocument response(512);
      response["success"] = true;
      response["intensity"] = ledIntensity;
      response["ledState"] = ledState;
      response["manualMode"] = ledManualMode;
      response["message"] = "LED actualizado correctamente";
      
      String json;
      serializeJson(response, json);
      return createJSONResponse(json);
    }
  }
  
  return createErrorResponse("Datos LED inválidos", 400);
}

String handleConfigRequest(String body) {
  DynamicJsonDocument doc(512);
  
  if (!deserializeJson(doc, body)) {
    bool configChanged = false;
    
    if (doc.containsKey("ip")) {
      String newIP = doc["ip"];
      if (isValidIPFormat(newIP)) {
        parseNewIP(newIP);
        configChanged = true;
        
        saveConfiguration();
        
        scheduleRestart = true;
        restartTime = millis() + 3000;
        
        DynamicJsonDocument response(512);
        response["success"] = true;
        response["message"] = "IP actualizada - reiniciando";
        response["newIP"] = newIP;
        response["restart"] = true;
        response["restartTime"] = 3;
        
        String json;
        serializeJson(response, json);
        return createJSONResponse(json);
      }
    }
    
    if (doc.containsKey("network")) {
      JsonObject net = doc["network"];
      configChanged = true;
    }
    
    if (configChanged) {
      saveConfiguration();
    }
  }
  
  return createErrorResponse("Configuración inválida", 400);
}

String handleSensorsRequest(String body) {
  DynamicJsonDocument doc(512);
  
  if (!deserializeJson(doc, body)) {
    bool configChanged = false;
    
    if (doc.containsKey("ldr")) {
      JsonObject ldrConfig = doc["ldr"];
      if (ldrConfig.containsKey("enabled")) config.ldrEnabled = ldrConfig["enabled"];
      if (ldrConfig.containsKey("thresholdOn")) config.ldrThresholdOn = ldrConfig["thresholdOn"];
      if (ldrConfig.containsKey("thresholdOff")) config.ldrThresholdOff = ldrConfig["thresholdOff"];
      if (ldrConfig.containsKey("calibrationFactor")) config.ldrCalibrationFactor = ldrConfig["calibrationFactor"];
      configChanged = true;
    }
    
    if (doc.containsKey("pir")) {
      JsonObject pirConfig = doc["pir"];
      if (pirConfig.containsKey("enabled")) config.pirEnabled = pirConfig["enabled"];
      if (pirConfig.containsKey("sensitivity")) config.pirSensitivity = pirConfig["sensitivity"];
      if (pirConfig.containsKey("activationTime")) config.pirActivationTime = pirConfig["activationTime"];
      configChanged = true;
    }
    
    if (doc.containsKey("acs712")) {
      JsonObject acsConfig = doc["acs712"];
      if (acsConfig.containsKey("enabled")) config.acs712Enabled = acsConfig["enabled"];
      if (acsConfig.containsKey("model")) config.acs712Model = acsConfig["model"].as<String>();
      if (acsConfig.containsKey("sensitivity")) config.acs712Sensitivity = acsConfig["sensitivity"];
      configChanged = true;
    }
    
    if (configChanged) {
      saveConfiguration();
      
      DynamicJsonDocument response(512);
      response["success"] = true;
      response["message"] = "Configuración de sensores actualizada";
      response["config"] = doc;
      
      String json;
      serializeJson(response, json);
      return createJSONResponse(json);
    }
  }
  
  return createErrorResponse("Configuración de sensores inválida", 400);
}

String handleAutomationRequest(String body) {
  DynamicJsonDocument doc(512);
  
  if (!deserializeJson(doc, body)) {
    if (doc.containsKey("enabled")) automation.enabled = doc["enabled"];
    if (doc.containsKey("mode")) automation.mode = doc["mode"].as<String>();
    if (doc.containsKey("ldrAutomatic")) automation.ldrAutomatic = doc["ldrAutomatic"];
    if (doc.containsKey("pirAutomatic")) automation.pirAutomatic = doc["pirAutomatic"];
    if (doc.containsKey("scheduleEnabled")) automation.scheduleEnabled = doc["scheduleEnabled"];
    
    if (doc.containsKey("forcedOnTime")) automation.forcedOnTime = doc["forcedOnTime"].as<String>();
    if (doc.containsKey("forcedOffTime")) automation.forcedOffTime = doc["forcedOffTime"].as<String>();
    
    DynamicJsonDocument response(512);
    response["success"] = true;
    response["message"] = "Automatización configurada";
    response["automation"] = doc;
    
    String json;
    serializeJson(response, json);
    return createJSONResponse(json);
  }
  
  return createErrorResponse("Configuración de automatización inválida", 400);
}

String handleInfoRequest() {
  DynamicJsonDocument doc(512);
  
  doc["deviceId"] = deviceId;
  doc["deviceName"] = deviceName;
  doc["firmwareVersion"] = firmwareVersion;
  doc["hardwareModel"] = "ESP32-WROOM-32";
  doc["networkModule"] = "WIZnet W5500";
  doc["sensors"] = "LDR, PIR, ACS712";
  doc["ledType"] = "PWM 255 levels";
  doc["bootTime"] = bootTime;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["chipRevision"] = ESP.getChipRevision();
  doc["flashSize"] = ESP.getFlashChipSize();
  
  String json;
  serializeJson(doc, json);
  return createJSONResponse(json);
}

String createWebPage() {
  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
  html += "<title>ESP32 Alumbrado Inteligente v2.1.0</title>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>";
  html += "body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#f5f5f5;}";
  html += ".container{max-width:800px;margin:0 auto;background:white;border-radius:10px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,0.1);}";
  html += ".header{text-align:center;margin-bottom:30px;padding:20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border-radius:10px;}";
  html += ".status{background:#f8f9fa;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #007bff;}";
  html += ".sensor{display:inline-block;margin:10px;padding:15px;background:#e8f4f8;border-radius:8px;min-width:150px;text-align:center;}";
  html += ".controls{background:#fff3cd;padding:20px;border-radius:10px;margin:20px 0;}";
  html += ".slider{width:100%;height:8px;border-radius:5px;background:#ddd;outline:none;margin:15px 0;}";
  html += ".btn{padding:10px 20px;margin:5px;border:none;border-radius:5px;cursor:pointer;font-weight:bold;transition:all 0.3s;}";
  html += ".btn-primary{background:#007bff;color:white;} .btn-primary:hover{background:#0056b3;}";
  html += ".btn-success{background:#28a745;color:white;} .btn-success:hover{background:#1e7e34;}";
  html += ".btn-warning{background:#ffc107;color:#212529;} .btn-warning:hover{background:#e0a800;}";
  html += ".btn-danger{background:#dc3545;color:white;} .btn-danger:hover{background:#c82333;}";
  html += ".value-display{font-size:24px;font-weight:bold;color:#007bff;margin:10px 0;}";
  html += ".footer{text-align:center;margin-top:30px;padding:15px;background:#6c757d;color:white;border-radius:5px;font-size:12px;}";
  html += "</style></head><body>";
  
  html += "<div class='container'>";
  html += "<div class='header'>";
  html += "<h1>🚨 ESP32 Alumbrado Inteligente</h1>";
  html += "<h3>Versión " + firmwareVersion + " | Device: " + deviceId + "</h3>";
  html += "<p>IP: " + ip.toString() + " | Uptime: " + String((millis() - bootTime) / 1000) + "s</p>";
  html += "</div>";
  
  html += "<div class='status'>";
  html += "<h3>📊 Estado del Sistema</h3>";
  html += "<div class='value-display'>LED: " + String(ledIntensity) + "/255 (" + String(round((ledIntensity/255.0)*100)) + "%)</div>";
  html += "<p><strong>Estado:</strong> " + String(ledState ? "🟢 Encendido" : "🔴 Apagado") + "</p>";
  html += "<p><strong>Modo:</strong> " + String(ledManualMode ? "Manual" : "Automático") + "</p>";
  html += "</div>";
  
  html += "<div class='status'>";
  html += "<h3>🔬 Sensores en Tiempo Real</h3>";
  html += "<div class='sensor' id='ldr-sensor'><strong>💡 LDR</strong><br><span id='ldr-raw'>" + String(sensors.ldrRaw) + "</span> raw<br><span id='ldr-lux'>" + String(sensors.luxCalculated, 1) + "</span> lux</div>";
  html += "<div class='sensor' id='pir-sensor'><strong>👁️ PIR</strong><br>" + String(sensors.pirDetection ? "🟢 Movimiento" : "⚪ Sin movimiento") + "<br>Hoy: <span id='pir-count'>" + String(sensors.pirCounterToday) + "</span></div>";
  html += "<div class='sensor' id='acs-sensor'><strong>⚡ ACS712</strong><br><span id='acs-raw'>" + String(sensors.acs712Raw) + "</span> raw<br><span id='acs-current'>" + String(sensors.currentAmps, 2) + "</span>A</div>";
  html += "</div>";
  
  html += "<div class='controls'>";
  html += "<h3>💡 Control de Intensidad LED</h3>";
  html += "<input type='range' id='ledSlider' min='0' max='255' value='" + String(ledIntensity) + "' class='slider'>";
  html += "<div class='value-display'><span id='ledValue'>" + String(ledIntensity) + "</span>/255</div>";
  html += "<div style='text-align:center;margin:20px 0;'>";
  html += "<button class='btn btn-danger' onclick='setLED(0)'>🌑 Apagar</button>";
  html += "<button class='btn btn-warning' onclick='setLED(64)'>🌘 25%</button>";
  html += "<button class='btn btn-warning' onclick='setLED(128)'>🌗 50%</button>";
  html += "<button class='btn btn-warning' onclick='setLED(191)'>🌖 75%</button>";
  html += "<button class='btn btn-success' onclick='setLED(255)'>🌕 Máximo</button>";
  html += "</div>";
  html += "</div>";
  
  html += "<div class='footer'>";
  html += "🔧 ESP32 + WIZnet W5500 | 📡 HTTP REST API | 🔬 LDR + PIR + ACS712<br>";
  html += "Última actualización: <span id='lastUpdate'>--:--:--</span> | Estado de red: <span id='linkStatus'>Verificando...</span>";
  html += "</div>";
  
  html += "</div>";
  
  html += "<script>";
  html += "const slider = document.getElementById('ledSlider');";
  html += "const value = document.getElementById('ledValue');";
  html += "let updating = false;";
  
  html += "slider.oninput = function() { ";
  html += "  if(!updating) { value.innerHTML = this.value; setLED(this.value); }";
  html += "};";
  
  html += "function setLED(intensity) {";
  html += "  if(updating) return;";
  html += "  updating = true;";
  html += "  fetch('/api/led', {";
  html += "    method: 'POST',";
  html += "    headers: {'Content-Type': 'application/json'},";
  html += "    body: JSON.stringify({intensity: parseInt(intensity), manual: true})";
  html += "  }).then(r => r.json()).then(d => {";
  html += "    if(d.success) { ";
  html += "      slider.value = d.intensity; ";
  html += "      value.innerHTML = d.intensity; ";
  html += "    }";
  html += "    updating = false;";
  html += "  }).catch(e => {";
  html += "    console.error('Error:', e);";
  html += "    updating = false;";
  html += "  });";
  html += "}";
  
  html += "function updateStatus() {";
  html += "  fetch('/api/status').then(r=>r.json()).then(d=>{";
  html += "    document.getElementById('ldr-raw').textContent = d.sensors.ldr.raw;";
  html += "    document.getElementById('ldr-lux').textContent = d.sensors.ldr.lux.toFixed(1);";
  html += "    document.getElementById('pir-count').textContent = d.sensors.pir.counterToday;";
  html += "    document.getElementById('acs-raw').textContent = d.sensors.acs712.raw;";
  html += "    document.getElementById('acs-current').textContent = d.sensors.acs712.current.toFixed(2);";
  html += "    document.getElementById('linkStatus').textContent = d.linkStatus;";
  html += "    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();";
  html += "    ";
  html += "    if(!updating) {";
  html += "      slider.value = d.ledIntensity;";
  html += "      value.innerHTML = d.ledIntensity;";
  html += "    }";
  html += "  }).catch(e => {";
  html += "    document.getElementById('linkStatus').textContent = 'Error';";
  html += "  });";
  html += "}";
  
  html += "updateStatus();";
  html += "setInterval(updateStatus, 3000);";
  html += "</script></body></html>";
  
  String response = "HTTP/1.1 200 OK\r\n";
  response += "Content-Type: text/html; charset=UTF-8\r\n";
  response += "Access-Control-Allow-Origin: *\r\n";
  response += "Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma\r\n";  // ← CORREGIDO
  response += "Cache-Control: no-cache\r\n";
  response += "Connection: close\r\n";
  response += "Content-Length: " + String(html.length()) + "\r\n\r\n";
  response += html;
  
  return response;
}

// ===== UTILIDADES GENERALES =====
bool isValidIPFormat(String ipStr) {
  int parts = 0;
  int lastDot = -1;
  
  for (int i = 0; i <= ipStr.length(); i++) {
    if (i == ipStr.length() || ipStr[i] == '.') {
      if (i - lastDot - 1 == 0) return false;
      
      String part = ipStr.substring(lastDot + 1, i);
      int num = part.toInt();
      
      if (num < 0 || num > 255) return false;
      if (part != String(num)) return false;
      
      parts++;
      lastDot = i;
    }
  }
  
  return parts == 4;
}

void parseNewIP(String ipStr) {
  int parts[4];
  int partIndex = 0;
  int lastDot = -1;
  
  for (int i = 0; i <= ipStr.length(); i++) {
    if (i == ipStr.length() || ipStr[i] == '.') {
      String part = ipStr.substring(lastDot + 1, i);
      parts[partIndex] = part.toInt();
      partIndex++;
      lastDot = i;
    }
  }
  
  ip = IPAddress(parts[0], parts[1], parts[2], parts[3]);
}

void sendDataToWebApp() {
  Serial.println("📤 Enviando datos a WebApp (simulado)");
}

void resetDailyCounters() {
  Serial.println("🔄 Reset diario de contadores");
  sensors.pirCounterToday = 0;
  sensors.consumptionToday = 0;
  sensors.costToday = 0;
  sensors.timeOnToday = 0;
  sensors.switchesOnToday = 0;
  dailyResetTime = millis();
}

void printStatus() {
  Serial.println("=== STATUS ===");
  Serial.println("💡 LED: " + String(ledIntensity) + "/255 (" + String(ledState ? "ON" : "OFF") + ")");
  Serial.println("🌞 LDR: " + String(sensors.luxCalculated, 1) + " lux (" + String(sensors.ldrRaw) + " raw)");
  Serial.println("👁️ PIR: " + String(sensors.pirDetection ? "DETECTANDO" : "INACTIVO") + " (Hoy: " + String(sensors.pirCounterToday) + ")");
  Serial.println("⚡ Corriente: " + String(sensors.currentAmps, 2) + "A (" + String(sensors.powerWatts, 1) + "W)");
  Serial.println("🌐 Red: " + String(Ethernet.linkStatus() == LinkON ? "CONECTADA" : "DESCONECTADA"));
  Serial.println("💾 Memoria: " + String(ESP.getFreeHeap()) + " bytes");
  Serial.println("🔗 IP: " + ip.toString() + " | Puerto: 80");
  Serial.println("📡 Servidor HTTP: ACTIVO con CORS habilitado");
  Serial.println("==============");
}

// FUNCIÓN HELPER PARA TESTING CORS
void printCORSTest() {
  Serial.println("\n🧪 CORS TEST INFO:");
  Serial.println("Para probar CORS desde navegador:");
  Serial.println("1. Abrir http://" + ip.toString());
  Serial.println("2. Consola del navegador: fetch('http://" + ip.toString() + "/api/status').then(r=>r.json()).then(console.log)");
  Serial.println("3. Verificar que no hay errores CORS");
  Serial.println("");
}