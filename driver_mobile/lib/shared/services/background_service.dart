import 'dart:async';
import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vibration/vibration.dart';
import 'api_constants.dart';

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  
  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
  
  const AndroidInitializationSettings initializationSettingsAndroid = AndroidInitializationSettings('@mipmap/ic_launcher');
  const InitializationSettings initializationSettings = InitializationSettings(android: initializationSettingsAndroid);
  await flutterLocalNotificationsPlugin.initialize(initializationSettings);
  
  const AndroidNotificationChannel channel = AndroidNotificationChannel(
    'driver_alerts',
    'Driver Alerts',
    description: 'Alerts for new delivery assignments',
    importance: Importance.max,
    playSound: true,
    enableVibration: true,
  );

  await flutterLocalNotificationsPlugin
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);

  int lastAssignmentCount = 0;
  
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  Future<int?> getDriverId() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('user_data');
    if (userStr != null) {
      final user = jsonDecode(userStr);
      return user['id'];
    }
    return null;
  }

  Timer.periodic(const Duration(seconds: 30), (timer) async {
    if (service is AndroidServiceInstance) {
      if (await service.isForegroundService()) {
        service.setForegroundNotificationInfo(
          title: "Driver Service",
          content: "Listening for new assignments...",
        );
      }
    }

    try {
      final token = await getToken();
      final driverId = await getDriverId();
      
      if (token == null || driverId == null) return;

      final uri = Uri.parse(ApiConstants.myAssignments).replace(queryParameters: {
        'driver_id': driverId.toString(),
      });

      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        // Count active assignments (assigned)
        final activeAssignments = data.where((a) => a['status'] == 'assigned').toList();
        final currentCount = activeAssignments.length;

        if (currentCount > lastAssignmentCount) {
             if (await Vibration.hasVibrator() ?? false) {
                Vibration.vibrate(pattern: [0, 1000, 500, 1000]); 
             }

             flutterLocalNotificationsPlugin.show(
                777,
                '📦 New Delivery Assigned!',
                'You have new delivery assignments waiting!',
                NotificationDetails(
                  android: AndroidNotificationDetails(
                    'driver_alerts',
                    'Driver Alerts',
                    channelDescription: 'Alerts for assignments',
                    importance: Importance.max,
                    priority: Priority.high,
                    playSound: true,
                    enableVibration: true,
                    fullScreenIntent: true,
                  ),
                ),
             );
        }
        
        lastAssignmentCount = currentCount;
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
      'driver_service',
      'Driver Background Service',
      description: 'Keeps the app listening for assignments',
      importance: Importance.low,
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
        notificationChannelId: 'driver_service',
        initialNotificationTitle: 'Driver Service',
        initialNotificationContent: 'Initializing...',
        foregroundServiceNotificationId: 888,
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: onStart,
      ),
    );
    
    await service.startService();
  }
}
