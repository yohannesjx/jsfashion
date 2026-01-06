import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/fulfillment_models.dart';
import 'api_constants.dart';
import '../services/auth_service.dart';

class FulfillmentService {
  final _authService = AuthService();

 Future<Map<String, String>> _getHeaders() async {
    final token = await _authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<http.Response> _authenticatedRequest(Future<http.Response> Function(Map<String, String> headers) request, {bool isRetry = false}) async {
    final headers = await _getHeaders();
    final response = await request(headers);

    if (response.statusCode == 401 || (response.statusCode == 500 && response.body.contains("expired"))) {
       if (isRetry) return response; // Prevent infinite loop

       print("Token expired. Attempting refresh...");
       final newToken = await _authService.refreshToken();
       if (newToken != null) {
          print("Token refreshed. Retrying request...");
          return _authenticatedRequest(request, isRetry: true);
       }
    }
    return response;
  }

  // --- PICKING ---

  Future<List<FulfillmentOrder>> getPendingPicking() async {
    final response = await _authenticatedRequest((headers) => http.get(
      Uri.parse(ApiConstants.pendingPicking),
      headers: headers,
    ));

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => FulfillmentOrder.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load picking tasks: ${response.body}');
    }
  }

  Future<void> startPicking(int orderId) async {
    final response = await _authenticatedRequest((headers) => http.post(
      Uri.parse(ApiConstants.startPicking(orderId)),
      headers: headers,
    ));

    if (response.statusCode != 200) {
      throw Exception('Failed to start picking: ${response.body}');
    }
  }

  Future<FulfillmentOrderDetails> getOrderDetails(int orderId) async {
    final response = await _authenticatedRequest((headers) => http.get(
      Uri.parse('${ApiConstants.baseUrl}/admin/fulfillment/orders/$orderId/items'),
      headers: headers,
    ));

    if (response.statusCode == 200) {
      return FulfillmentOrderDetails.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to load order details');
    }
  }

  Future<ScanResult> scanPickItem(int orderId, String sku) async {
    final response = await _authenticatedRequest((headers) => http.post(
      Uri.parse(ApiConstants.scanPick),
      headers: headers,
      body: json.encode({
        'fulfillment_order_id': orderId,
        'sku': sku,
        'quantity': 1,
      }),
    ));

    final data = json.decode(response.body);
    if (response.statusCode == 200) {
      return ScanResult.fromJson(data);
    } else {
      throw Exception(data['error'] ?? 'Scan failed');
    }
  }

  Future<void> completePicking(int orderId) async {
    final response = await _authenticatedRequest((headers) => http.post(
      Uri.parse(ApiConstants.completePicking(orderId)),
      headers: headers,
    ));

    if (response.statusCode != 200) {
      throw Exception('Failed to complete picking');
    }
  }

  // --- PACKING ---

  Future<List<FulfillmentOrder>> getPendingPacking() async {
    final response = await _authenticatedRequest((headers) => http.get(
      Uri.parse(ApiConstants.pendingPacking),
      headers: headers,
    ));

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => FulfillmentOrder.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load packing tasks');
    }
  }

  Future<void> startPacking(int orderId) async {
    final response = await _authenticatedRequest((headers) => http.post(
      Uri.parse(ApiConstants.startPacking(orderId)),
      headers: headers,
    ));

    if (response.statusCode != 200) {
      throw Exception('Failed to start packing');
    }
  }

  Future<ScanResult> scanPackItem(int orderId, String sku) async {
    final response = await _authenticatedRequest((headers) => http.post(
      Uri.parse(ApiConstants.scanPack),
      headers: headers,
      body: json.encode({
        'fulfillment_order_id': orderId,
        'sku': sku,
        'quantity': 1,
      }),
    ));

    final data = json.decode(response.body);
    if (response.statusCode == 200) {
      return ScanResult.fromJson(data);
    } else {
      throw Exception(data['error'] ?? 'Scan failed');
    }
  }

  Future<void> completePacking(int orderId) async {
    final response = await _authenticatedRequest((headers) => http.post(
      Uri.parse(ApiConstants.completePacking(orderId)),
      headers: headers,
    ));

    if (response.statusCode != 200) {
      throw Exception('Failed to complete packing');
    }
  }

  Future<String> getZplLabel(int orderId) async {
    final response = await _authenticatedRequest((headers) => http.get(
      Uri.parse(ApiConstants.getLabel(orderId)),
      headers: headers,
    ));

    if (response.statusCode == 200) {
      return response.body;
    } else {
      throw Exception('Failed to generate label');
    }
  }
}
