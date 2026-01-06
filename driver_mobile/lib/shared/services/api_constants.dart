class ApiConstants {
  static const String baseUrl = 'https://api.jsfashion.et/api/v1'; // Production API
  
  // Auth
  static const String login = '$baseUrl/admin/auth/login';
  
  // Driver
  static const String myAssignments = '$baseUrl/driver/assignments/my';
  static String updateAssignmentStatus(int id) => '$baseUrl/driver/assignments/$id/status';
  static String markDelivered(int id) => '$baseUrl/driver/orders/$id/deliver';
}
