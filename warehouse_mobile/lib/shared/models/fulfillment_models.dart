class FulfillmentOrder {
  final int id;
  final String orderId;
  final String trackingNumber;
  final String status;
  final int orderNumber;
  final String customerName;
  final int itemCount;
  final String totalAmount;
  final DateTime createdAt;

  FulfillmentOrder({
    required this.id,
    required this.orderId,
    required this.trackingNumber,
    required this.status,
    required this.orderNumber,
    required this.customerName,
    required this.itemCount,
    required this.totalAmount,
    required this.createdAt,
  });

  factory FulfillmentOrder.fromJson(Map<String, dynamic> json) {
    return FulfillmentOrder(
      id: json['id'],
      orderId: json['order_id'],
      trackingNumber: json['tracking_number'] ?? '',
      status: json['status'] ?? '',
      orderNumber: json['order_number'],
      customerName: json['customer_name'] ?? 'Unknown',
      itemCount: json['item_count'] ?? 0,
      totalAmount: json['total_amount'] ?? '0.00',
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}

class FulfillmentItem {
  final String id;
  final String sku;
  final String productName;
  final String variantName;
  final String imageUrl;
  final int quantity;
  final int pickedQuantity;
  final int packedQuantity;

  FulfillmentItem({
    required this.id,
    required this.sku,
    required this.productName,
    required this.variantName,
    required this.imageUrl,
    required this.quantity,
    required this.pickedQuantity,
    required this.packedQuantity,
  });

  factory FulfillmentItem.fromJson(Map<String, dynamic> json) {
    return FulfillmentItem(
      id: json['id'],
      sku: json['sku'],
      productName: json['product_name'],
      variantName: json['variant_name'],
      imageUrl: json['image_url'] ?? '',
      quantity: json['quantity'],
      pickedQuantity: json['picked_quantity'] ?? 0,
      packedQuantity: json['packed_quantity'] ?? 0,
    );
  }
}

class ScanResult {
  final bool success;
  final String message;
  final ScannedItem? item;
  final OrderProgress? progress;

  ScanResult({
    required this.success,
    required this.message,
    this.item,
    this.progress,
  });

  factory ScanResult.fromJson(Map<String, dynamic> json) {
    return ScanResult(
      success: json['success'],
      message: json['message'],
      item: json['item'] != null ? ScannedItem.fromJson(json['item']) : null,
      progress: json['order_progress'] != null 
          ? OrderProgress.fromJson(json['order_progress']) 
          : null,
    );
  }
}

class ScannedItem {
  final String sku;
  final String productName;
  final int quantityScanned;
  final int quantityRequired;

  ScannedItem({
    required this.sku,
    required this.productName,
    required this.quantityScanned,
    required this.quantityRequired,
  });

  factory ScannedItem.fromJson(Map<String, dynamic> json) {
    return ScannedItem(
      sku: json['sku'],
      productName: json['product_name'],
      quantityScanned: json['quantity_scanned'],
      quantityRequired: json['quantity_required'],
    );
  }
}

class OrderProgress {
  final int totalItems;
  final int scannedItems;
  final bool isComplete;

  OrderProgress({
    required this.totalItems,
    required this.scannedItems,
    required this.isComplete,
  });

  factory OrderProgress.fromJson(Map<String, dynamic> json) {
    return OrderProgress(
      totalItems: json['total_items'],
      scannedItems: json['scanned_items'],
      isComplete: json['is_complete'],
    );
  }
}
