import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/popup_model.dart';
import '../screens/product_detail_screen.dart';

class MarketingPopup extends StatelessWidget {
  final Popup popup;

  const MarketingPopup({Key? key, required this.popup}) : super(key: key);

  void _handleTap(BuildContext context) async {
    Navigator.of(context).pop(); // Close popup first

    if (popup.actionType == 'product') {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ProductDetailScreen(slug: popup.actionTarget),
        ),
      );
    } else if (popup.actionType == 'link') {
       if (await canLaunch(popup.actionTarget)) {
         await launch(popup.actionTarget);
       }
    } else if (popup.actionType == 'category') {
      // TODO: Navigate to category
    }
    // 'none' does nothing (just close)
  }

  @override
  Widget build(BuildContext context) {
    // Replaced Dialog with Material to ensure full control over hit testing
    return Material(
      type: MaterialType.transparency,
      child: Stack(
        fit: StackFit.expand, // Force stack to fill screen
        children: [
          // 1. Full-screen dismiss layer
          GestureDetector(
            onTap: () => Navigator.of(context).pop(),
            behavior: HitTestBehavior.opaque, // Catch all taps
            child: Container(color: Colors.transparent),
          ),
          
          // 2. Centered Content
          Center(
            child: GestureDetector(
              onTap: () => _handleTap(context),
              child: Container(
                width: MediaQuery.of(context).size.width * 0.9,
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.8,
                ),
                // Visual margin preserved via Center + Constraints, no extra padding needed
                child: CachedNetworkImage(
                  imageUrl: popup.imageUrl,
                  fit: BoxFit.contain,
                  placeholder: (context, url) => const SizedBox(
                    width: 40,
                    height: 40,
                    child: Center(
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  errorWidget: (context, url, error) => const Icon(Icons.error, color: Colors.white),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
