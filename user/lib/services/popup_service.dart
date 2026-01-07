import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/popup_model.dart';
import 'api_service.dart';

class PopupService {
  static final Set<String> shownInSession = {};
  
  static Future<Popup?> getActivePopup() async {
    try {
      final response = await http.get(
        Uri.parse('${ApiService.baseUrl}/popups/active'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['popup'] != null) {
          return Popup.fromJson(data['popup']);
        }
      }
    } catch (e) {
      print('Failed to fetch active popup: $e');
    }
    return null;
  }
}
