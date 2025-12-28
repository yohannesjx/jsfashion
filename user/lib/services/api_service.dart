import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants.dart';
import '../widgets/product_card.dart'; // For Product model if needed, or define distinct models
import '../screens/product_detail_screen.dart'; // For ProductVariant

class ApiService {
  static const String baseUrl = ApiConstants.baseUrl;

  // Singleton instance
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  /// Fetches a product variant by SKU.
  /// Returns null if not found.
  Future<ProductVariant?> getVariantBySku(String sku) async {
    try {
      final url = Uri.parse('$baseUrl/products/variants/sku/$sku');
      print('🔍 Scanning SKU: $sku at $url');
      
      final response = await http.get(url);
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['variant'] != null && data['product'] != null) {
          final variantData = data['variant'] as Map<String, dynamic>;
          final productData = data['product'] as Map<String, dynamic>;
          
          // Merge for ProductVariant.fromJson
          final merged = Map<String, dynamic>.from(variantData);
          merged['product_id'] = productData['id'];
          merged['name'] = '${productData['name']} ${variantData['size'] ?? ''} ${variantData['color'] ?? ''}'.trim();
          
          // Use product image if available, otherwise use variant image
          String? imageUrl = productData['image_url'];
          if (imageUrl == null || imageUrl.isEmpty) {
            imageUrl = variantData['image'];
          }
          merged['image_url'] = imageUrl;
          
          // fromJson expects 'price', which is already in variantData. 
          // It also checks 'sale_price' which is in variantData.
          
          return ProductVariant.fromJson(merged);
        }
      }
      return null;
    } catch (e) {
      print('❌ Error fetching variant by SKU: $e');
      return null;
    }
  }

  /// Creates a POS order.
  /// Returns the created order object or throws an exception.
  Future<Map<String, dynamic>> createPosOrder(Map<String, dynamic> orderData) async {
    final url = Uri.parse('$baseUrl/orders');
    print('🛒 Creating POS Order: $orderData');

    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode(orderData),
      );

      print('📡 Order Response: ${response.statusCode} - ${response.body}');

      if (response.statusCode == 201 || response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to create order: ${response.body}');
      }
    } catch (e) {
      print('❌ Error creating POS order: $e');
      rethrow;
    }
  }
}
