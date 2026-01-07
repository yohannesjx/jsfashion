import '../constants.dart';

class ApiService {
  static const String baseUrl = ApiConstants.baseUrl;

  // Singleton instance
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();
  
  // API methods can be added here as needed
}
