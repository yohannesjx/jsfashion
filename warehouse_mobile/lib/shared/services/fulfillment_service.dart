import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/fulfillment_models.dart';
import 'api_constants.dart';

class FulfillmentService {
  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  Future<Map<String, String>> _getHeaders() async {
    final token = await _getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  // --- PICKING ---

  Future<List<FulfillmentOrder>> getPendingPicking() async {
    final response = await http.get(
      Uri.parse(ApiConstants.pendingPicking),
      headers: await _getHeaders(),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => FulfillmentOrder.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load picking tasks');
    }
  }

  Future<void> startPicking(int orderId) async {
    final response = await http.post(
      Uri.parse(ApiConstants.startPicking(orderId)),
      headers: await _getHeaders(),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to start picking');
    }
  }

  Future<ScanResult> scanPickItem(int orderId, String sku) async {
    final response = await http.post(
      Uri.parse(ApiConstants.scanPick),
      headers: await _getHeaders(),
      body: json.encode({
        'fulfillment_order_id': orderId,
        'sku': sku,
        'quantity': 1,
      }),
    );

    final data = json.decode(response.body);
    if (response.statusCode == 200) {
      return ScanResult.fromJson(data);
    } else {
      throw Exception(data['error'] ?? 'Scan failed');
    }
  }

  Future<void> completePicking(int orderId) async {
    final response = await http.post(
      Uri.parse(ApiConstants.completePicking(orderId)),
      headers: await _getHeaders(),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to complete picking');
    }
  }

  // --- PACKING ---

  Future<List<FulfillmentOrder>> getPendingPacking() async {
    final response = await http.get(
      Uri.parse(ApiConstants.pendingPacking),
      headers: await _getHeaders(),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => FulfillmentOrder.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load packing tasks');
    }
  }

  Future<void> startPacking(int orderId) async {
    final response = await http.post(
      Uri.parse(ApiConstants.startPacking(orderId)),
      headers: await _getHeaders(),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to start packing');
    }
  }

  Future<ScanResult> scanPackItem(int orderId, String sku) async {
    final response = await http.post(
      Uri.parse(ApiConstants.scanPack),
      headers: await _getHeaders(),
      body: json.encode({
        'fulfillment_order_id': orderId,
        'sku': sku,
        'quantity': 1,
      }),
    );

    final data = json.decode(response.body);
    if (response.statusCode == 200) {
      return ScanResult.fromJson(data);
    } else {
      throw Exception(data['error'] ?? 'Scan failed');
    }
  }

  Future<void> completePacking(int orderId) async {
    final response = await http.post(
      Uri.parse(ApiConstants.completePacking(orderId)),
      headers: await _getHeaders(),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to complete packing');
    }
  }

  Future<String> getZplLabel(int orderId) async {
    final response = await http.get(
      Uri.parse(ApiConstants.getLabel(orderId)),
      headers: await _getHeaders(),
    );

    if (response.statusCode == 200) {
      return response.body;
    } else {
      throw Exception('Failed to generate label');
    }
  }
}
