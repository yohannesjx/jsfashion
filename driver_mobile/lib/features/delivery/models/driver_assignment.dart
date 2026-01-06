class DriverAssignment {
  final int id;
  final int fulfillmentOrderId;
  final String trackingNumber;
  final int orderNumber;
  final String assignmentType;
  final String status;
  final String deliveryAddress;
  final String deliveryPhone;
  final String deliveryNotes;
  final String customerName;
  final String customerPhone;
  final String totalAmount;
  final DateTime assignedAt;
  final DateTime? pickedUpAt;
  final DateTime? completedAt;

  DriverAssignment({
    required this.id,
    required this.fulfillmentOrderId,
    required this.trackingNumber,
    required this.orderNumber,
    required this.assignmentType,
    required this.status,
    required this.deliveryAddress,
    required this.deliveryPhone,
    required this.deliveryNotes,
    required this.customerName,
    required this.customerPhone,
    required this.totalAmount,
    required this.assignedAt,
    this.pickedUpAt,
    this.completedAt,
  });

  factory DriverAssignment.fromJson(Map<String, dynamic> json) {
    return DriverAssignment(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      fulfillmentOrderId: json['fulfillment_order_id'] is int ? json['fulfillment_order_id'] : int.parse(json['fulfillment_order_id'].toString()),
      trackingNumber: json['tracking_number']?.toString() ?? '',
      orderNumber: json['order_number'] is int ? json['order_number'] : int.parse(json['order_number'].toString()),
      assignmentType: json['assignment_type']?.toString() ?? 'delivery',
      status: json['status']?.toString() ?? 'assigned',
      deliveryAddress: json['delivery_address']?.toString() ?? '',
      deliveryPhone: json['delivery_phone']?.toString() ?? '',
      deliveryNotes: json['delivery_notes']?.toString() ?? '',
      customerName: json['customer_name']?.toString() ?? '',
      customerPhone: json['customer_phone']?.toString() ?? '',
      totalAmount: json['total_amount']?.toString() ?? '0.00',
      assignedAt: DateTime.parse(json['assigned_at'].toString()),
      pickedUpAt: json['picked_up_at'] != null ? DateTime.parse(json['picked_up_at'].toString()) : null,
      completedAt: json['completed_at'] != null ? DateTime.parse(json['completed_at'].toString()) : null,
    );
  }
}
