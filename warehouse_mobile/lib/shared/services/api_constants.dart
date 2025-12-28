class ApiConstants {
  static const String baseUrl = 'http://jsfashion.et:8081/api/v1'; // Remote Backend Port 8081
  
  // Auth
  static const String login = '$baseUrl/admin/auth/login';
  
  // Fulfillment - Picking
  static const String pendingPicking = '$baseUrl/admin/fulfillment/pick/pending';
  static String startPicking(int id) => '$baseUrl/admin/fulfillment/pick/start/$id';
  static const String scanPick = '$baseUrl/admin/fulfillment/pick/scan';
  static String completePicking(int id) => '$baseUrl/admin/fulfillment/pick/complete/$id';
  
  // Fulfillment - Packing
  static const String pendingPacking = '$baseUrl/admin/fulfillment/pack/pending';
  static String startPacking(int id) => '$baseUrl/admin/fulfillment/pack/start/$id';
  static const String scanPack = '$baseUrl/admin/fulfillment/pack/scan';
  static String completePacking(int id) => '$baseUrl/admin/fulfillment/pack/complete/$id';
  static String getLabel(int id) => '$baseUrl/admin/fulfillment/orders/$id/label';
}
