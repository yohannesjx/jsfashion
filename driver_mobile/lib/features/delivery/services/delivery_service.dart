import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../../shared/services/api_constants.dart';
import '../../../shared/services/auth_service.dart';
import '../models/driver_assignment.dart';

class DeliveryService {
  final _authService = AuthService();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<http.Response> _authenticatedRequest(
      Future<http.Response> Function(Map<String, String> headers) request,
      {bool isRetry = false}) async {
    final headers = await _getHeaders();
    final response = await request(headers);

    if (response.statusCode == 401 ||
        (response.statusCode == 500 && response.body.contains("expired"))) {
      if (isRetry) return response;

      print("Token expired. Attempting refresh...");
      final newToken = await _authService.refreshToken();
      if (newToken != null) {
        print("Token refreshed. Retrying request...");
        return _authenticatedRequest(request, isRetry: true);
      }
    }
    return response;
  }

  Future<List<DriverAssignment>> getMyAssignments() async {
    final user = await _authService.getUser();
    final driverId = user?['id']; 

    final uri = Uri.parse(ApiConstants.myAssignments).replace(queryParameters: {
      if (driverId != null) 'driver_id': driverId.toString(),
    });

    final response = await _authenticatedRequest((headers) => http.get(
          uri,
          headers: headers,
        ));

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => DriverAssignment.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load assignments: ${response.body}');
    }
  }

  Future<void> updateStatus(int assignmentId, String status, {String? notes}) async {
    final response = await _authenticatedRequest((headers) => http.put(
          Uri.parse(ApiConstants.updateAssignmentStatus(assignmentId)),
          headers: headers,
          body: json.encode({
            'status': status,
            if (notes != null) 'notes': notes,
          }),
        ));

    if (response.statusCode != 200) {
      throw Exception('Failed to update status: ${response.body}');
    }
  }

  Future<void> markDelivered(
    int orderId, {
    required File signature,
    required File photo,
    String? notes,
  }) async {
    final token = await _authService.getToken();
    final uri = Uri.parse(ApiConstants.markDelivered(orderId));
    
    final request = http.MultipartRequest('POST', uri);
    request.headers['Authorization'] = 'Bearer $token';
    
    if (notes != null) {
      request.fields['notes'] = notes;
    }
    
    request.files.add(await http.MultipartFile.fromPath(
      'signature',
      signature.path,
    ));
    
    request.files.add(await http.MultipartFile.fromPath(
      'photo',
      photo.path,
    ));

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode != 200) {
       if (response.statusCode == 401) {
          final newToken = await _authService.refreshToken();
          if (newToken != null) {
             return markDelivered(orderId, signature: signature, photo: photo, notes: notes);
          }
       }
      throw Exception('Failed to mark delivered: ${response.body}');
    }
  }
}
