import 'dart:async';
import 'dart:convert';
import 'dart:ui';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vibration/vibration.dart';
import 'api_constants.dart';

// Must be top-level function
@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  
  // Notification Setup for High Priority Alerts
  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
  
  // Initialize with proper settings
  const AndroidInitializationSettings initializationSettingsAndroid = AndroidInitializationSettings('@mipmap/ic_launcher');
  const InitializationSettings initializationSettings = InitializationSettings(android: initializationSettingsAndroid);
  await flutterLocalNotificationsPlugin.initialize(initializationSettings);
  
  const AndroidNotificationChannel channel = AndroidNotificationChannel(
    'warehouse_alerts',
    'Warehouse Alerts',
    description: 'High priority alerts for new orders',
    importance: Importance.max,
    playSound: true,
    enableVibration: true,
  );

  await flutterLocalNotificationsPlugin
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);

  // Initial State
  int lastOrderCount = 0;
  
  // Get Token helper
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  // Periodic Timer
  Timer.periodic(const Duration(seconds: 15), (timer) async {
    if (service is AndroidServiceInstance) {
      if (await service.isForegroundService()) {
        service.setForegroundNotificationInfo(
          title: "Warehouse Service",
          content: "Listening for new orders...",
        );
      }
    }

    try {
      final token = await getToken();
      if (token == null) return;

      final response = await http.get(
        Uri.parse(ApiConstants.pendingPicking),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        final currentCount = data.length;

        if (currentCount > lastOrderCount) {
             // TRIGGER VIBRATION
             if (await Vibration.hasVibrator() ?? false) {
                // Pattern: Wait 0, Vibrate 1000, Wait 500, Vibrate 1000, Wait 500, Vibrate 1000
                Vibration.vibrate(pattern: [0, 1000, 500, 1000, 500, 1000]); 
             }

             // Show Notification with sound and vibration
             flutterLocalNotificationsPlugin.show(
                888,
                '🔔 New Order Arrived!',
                'You have $currentCount order(s) waiting for picking!',
                NotificationDetails(
                  android: AndroidNotificationDetails(
                    'warehouse_alerts',
                    'Warehouse Alerts',
                    channelDescription: 'High priority alerts',
                    importance: Importance.max,
                    priority: Priority.high,
                    playSound: true,
                    enableVibration: true,
                    fullScreenIntent: true,
                    category: AndroidNotificationCategory.alarm,
                  ),
                ),
             );
        }
        
        lastOrderCount = currentCount;
      }
    } catch (e) {
      print("Background logic error: $e");
    }
  });
}

class BackgroundService {
  static Future<void> initialize() async {
    final service = FlutterBackgroundService();

    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      'warehouse_service',
      'Warehouse Background Service',
      description: 'Keeps the app listening for orders',
      importance: Importance.low, // Low importance for the persistent one
    );

    final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onStart,
        autoStart: true,
        isForegroundMode: true,
        notificationChannelId: 'warehouse_service',
        initialNotificationTitle: 'Warehouse Service',
        initialNotificationContent: 'Initializing...',
        foregroundServiceNotificationId: 999,
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: onStart,
      ),
    );
    
    await service.startService();
  }
}
