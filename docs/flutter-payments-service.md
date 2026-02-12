# Ready-to-use Flutter Payments Service (Dio + in_app_purchase)

> Drop these files into your Flutter app (example paths shown) and adjust base URL/token provider.

## 1) `lib/features/payments/data/payments_api.dart`

```dart
import 'package:dio/dio.dart';

class PaymentsApi {
  PaymentsApi({required Dio dio, required this.tokenProvider}) : _dio = dio;

  final Dio _dio;
  final Future<String?> Function() tokenProvider;

  Future<Map<String, dynamic>> verifyPurchase({
    required String platform, // GOOGLE_PLAY | APPLE_STORE
    required String productId,
    String? purchaseToken,
    String? transactionId,
  }) async {
    final token = await tokenProvider();
    final response = await _dio.post<Map<String, dynamic>>(
      '/payments/verify',
      data: {
        'platform': platform,
        'productId': productId,
        if (purchaseToken != null) 'purchaseToken': purchaseToken,
        if (transactionId != null) 'transactionId': transactionId,
      },
      options: Options(
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ),
    );

    return response.data ?? <String, dynamic>{};
  }

  Future<List<dynamic>> getSubscriptions() async {
    final token = await tokenProvider();
    final response = await _dio.get<Map<String, dynamic>>(
      '/payments/subscriptions',
      options: Options(
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ),
    );

    return (response.data?['subscriptions'] as List<dynamic>? ?? <dynamic>[]);
  }

  Future<Map<String, dynamic>> getMe() async {
    final token = await tokenProvider();
    final response = await _dio.get<Map<String, dynamic>>(
      '/auth/me',
      options: Options(
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ),
    );

    return response.data ?? <String, dynamic>{};
  }
}
```

## 2) `lib/features/payments/domain/models/subscription_models.dart`

```dart
enum StorePlatform { googlePlay, appleStore }

extension StorePlatformX on StorePlatform {
  String get apiValue {
    switch (this) {
      case StorePlatform.googlePlay:
        return 'GOOGLE_PLAY';
      case StorePlatform.appleStore:
        return 'APPLE_STORE';
    }
  }
}

class VerifiedSubscription {
  const VerifiedSubscription({
    required this.status,
    required this.tier,
    required this.expiryDate,
    required this.autoRenewing,
  });

  final String status;
  final String tier;
  final DateTime? expiryDate;
  final bool autoRenewing;

  bool get hasPremiumAccess => status == 'ACTIVE' || status == 'GRACE_PERIOD';

  factory VerifiedSubscription.fromJson(Map<String, dynamic> json) {
    return VerifiedSubscription(
      status: (json['status'] as String? ?? 'EXPIRED').toUpperCase(),
      tier: (json['tier'] as String? ?? 'FREE').toUpperCase(),
      expiryDate: json['expiryDate'] == null
          ? null
          : DateTime.tryParse(json['expiryDate'] as String),
      autoRenewing: json['autoRenewing'] == true,
    );
  }
}
```

## 3) `lib/features/payments/application/payments_service.dart`

```dart
import 'dart:async';
import 'dart:io';

import 'package:in_app_purchase/in_app_purchase.dart';

import '../data/payments_api.dart';
import '../domain/models/subscription_models.dart';

class PaymentsService {
  PaymentsService(this._api, this._inAppPurchase);

  final PaymentsApi _api;
  final InAppPurchase _inAppPurchase;

  StreamSubscription<List<PurchaseDetails>>? _purchaseSub;

  void startPurchaseListener({
    required Future<void> Function(VerifiedSubscription?) onVerified,
    required Future<void> Function(Object error) onError,
  }) {
    _purchaseSub = _inAppPurchase.purchaseStream.listen(
      (purchases) async {
        for (final purchase in purchases) {
          try {
            if (purchase.status == PurchaseStatus.pending) {
              continue;
            }

            if (purchase.status == PurchaseStatus.error) {
              throw purchase.error ?? Exception('Purchase failed');
            }

            if (purchase.status == PurchaseStatus.purchased ||
                purchase.status == PurchaseStatus.restored) {
              final verified = await _verifyWithBackend(purchase);
              await onVerified(verified);
            }

            if (purchase.pendingCompletePurchase) {
              await _inAppPurchase.completePurchase(purchase);
            }
          } catch (e) {
            await onError(e);
          }
        }
      },
      onError: (Object e) async => onError(e),
      cancelOnError: false,
    );
  }

  Future<void> dispose() async {
    await _purchaseSub?.cancel();
  }

  Future<VerifiedSubscription?> verifyRestoredPurchase(
    PurchaseDetails purchase,
  ) async {
    return _verifyWithBackend(purchase);
  }

  Future<List<VerifiedSubscription>> fetchSubscriptions() async {
    final rows = await _api.getSubscriptions();
    return rows
        .whereType<Map<String, dynamic>>()
        .map(VerifiedSubscription.fromJson)
        .toList();
  }

  Future<VerifiedSubscription?> _verifyWithBackend(PurchaseDetails purchase) async {
    final platform = Platform.isIOS
        ? StorePlatform.appleStore
        : StorePlatform.googlePlay;

    String? purchaseToken;
    String? transactionId;

    if (Platform.isAndroid) {
      // For Play Billing through in_app_purchase, token is usually serverVerificationData.
      purchaseToken = purchase.verificationData.serverVerificationData;
    } else {
      // On iOS, use purchaseID as transactionId.
      transactionId = purchase.purchaseID;
    }

    final res = await _api.verifyPurchase(
      platform: platform.apiValue,
      productId: purchase.productID,
      purchaseToken: purchaseToken,
      transactionId: transactionId,
    );

    final subJson = res['subscription'];
    if (subJson is Map<String, dynamic>) {
      return VerifiedSubscription.fromJson(subJson);
    }

    return null;
  }
}
```

## 4) `lib/core/network/dio_setup.dart`

```dart
import 'package:dio/dio.dart';

Dio createDio() {
  return Dio(
    BaseOptions(
      baseUrl: 'https://your-domain.com/api/v1',
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
      headers: {
        'Content-Type': 'application/json',
      },
    ),
  );
}
```

## 5) Usage example

```dart
final dio = createDio();
final api = PaymentsApi(
  dio: dio,
  tokenProvider: () async => await authRepository.getAccessToken(),
);
final paymentsService = PaymentsService(api, InAppPurchase.instance);

paymentsService.startPurchaseListener(
  onVerified: (subscription) async {
    // Refresh profile, unlock features, update state
    final me = await api.getMe();
    // ...apply entitlements from backend
  },
  onError: (error) async {
    // Show retry UI/logging
  },
);
```

## Notes

- Always gate premium features by backend response (`/auth/me` and/or `/payments/subscriptions`).
- For restore purchases, run backend verify for each restored item.
- Keep product IDs identical between stores, Flutter config, and backend tier map.
