class ApiConstants {
  static const String baseUrl = 'https://api.jsfashion.et/api/v1'; // Production API
  
  // Auth
  static const String login = '$baseUrl/admin/auth/login';
  
  // Fulfillment - Picking
  static const String pendingPicking = '$baseUrl/admin/fulfillment/pick/pending';
  static String startPicking(int id) => '$baseUrl/admin/fulfillment/pick/$id/start';
  static const String scanPick = '$baseUrl/admin/fulfillment/pick/scan';
  static String completePicking(int id) => '$baseUrl/admin/fulfillment/pick/$id/complete';
  
  // Fulfillment - Packing
  static const String pendingPacking = '$baseUrl/admin/fulfillment/pack/pending';
  static String startPacking(int id) => '$baseUrl/admin/fulfillment/pack/$id/start';
  static const String scanPack = '$baseUrl/admin/fulfillment/pack/scan';
  static String completePacking(int id) => '$baseUrl/admin/fulfillment/pack/$id/complete';
  static String getLabel(int id) => '$baseUrl/admin/fulfillment/pack/$id/label';
}
