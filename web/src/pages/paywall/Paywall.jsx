import { useState, useEffect } from 'react';
import { useLicense } from '../../contexts/LicenseContext';
import { Crown, CreditCard, RefreshCw, X } from 'lucide-react';

const Paywall = ({ onClose, compact = false }) => {
  const { licenseState, refreshState } = useLicense();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [canMakePayments, setCanMakePayments] = useState(true);
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        const prods = await window.api.getLicenseProducts();
        if (isMounted) {
          setProducts(prods);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setError('Failed to load products');
          setLoading(false);
        }
      }
    };

    const checkCanMakePayments = async () => {
      try {
        const can = await window.api.canMakeLicensePayments();
        if (isMounted) setCanMakePayments(can);
      } catch {
        if (isMounted) setCanMakePayments(false);
      }
    };

    const loadTrialInfo = async () => {
      try {
        const { data } = await window.api.getLicenseState();
        if (isMounted && data.trialStartedAt && licenseState === 'trial') {
          const start = new Date(data.trialStartedAt);
          const diff = Date.now() - start.getTime();
          const daysLeft = 14 - Math.floor(diff / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(daysLeft);
        }
      } catch (err) {
        console.error('[Paywall] Failed to load trial info:', err);
      }
    };

    loadProducts();
    checkCanMakePayments();
    loadTrialInfo();

    return () => {
      isMounted = false;
    };
  }, [licenseState]);

  const handlePurchase = async (productId) => {
    setPurchasing(true);
    setError(null);
    try {
      const result = await window.api.purchaseLicense(productId);
      if (result.success) {
        await refreshState();
      } else {
        setError(result.error || 'Purchase failed');
      }
    } catch (err) {
      setError(err.message || 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setError(null);
    try {
      const result = await window.api.restoreLicensePurchases();
      if (result.success) {
        await refreshState();
      } else {
        setError(result.error || 'Restore failed');
      }
    } catch (err) {
      setError(err.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  const getTitle = () => {
    if (licenseState === 'expired') {
      return 'Pyramid Notes 已到期';
    }
    if (licenseState === 'trial' && trialDaysLeft !== null) {
      return `试用期还剩 ${trialDaysLeft} 天`;
    }
    return 'Pyramid Notes';
  };

  const getSubtitle = () => {
    if (licenseState === 'expired') {
      return '购买永久版解锁全部功能';
    }
    if (licenseState === 'trial') {
      return '升级永久版，永不过期';
    }
    return '';
  };

  const content = (
    <div style={{
      maxWidth: '500px',
      width: '100%',
      margin: '0 auto',
      textAlign: 'center',
      position: 'relative',
    }}>
      {/* Close button for modal */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-12px',
            right: '-12px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            background: 'var(--border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="关闭"
        >
          <X size={18} />
        </button>
      )}

      {/* Logo */}
      <div style={{
        width: '80px',
        height: '80px',
        margin: '0 auto 24px',
        background: 'var(--primary)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Crown size={48} color="white" />
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: '28px',
        fontWeight: 'bold',
        marginBottom: '8px',
      }}>
        {getTitle()}
      </h1>

      {/* Subtitle */}
      <p style={{
        fontSize: '16px',
        color: 'var(--text-secondary)',
        marginBottom: '32px',
      }}>
        {getSubtitle()}
      </p>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px',
          background: 'var(--error-bg)',
          color: 'var(--error)',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {/* Products */}
      {loading ? (
        <div style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      ) : (
        <div style={{ marginBottom: '24px' }}>
          {products.map((product) => (
            <div key={product.id} style={{
              border: '2px solid var(--primary)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              background: 'var(--card-bg)',
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}>
                {product.displayName}
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                marginBottom: '12px',
              }}>
                {product.description}
              </p>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--primary)',
              }}>
                {product.price}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Button */}
      <button
        onClick={() => products.length > 0 && handlePurchase(products[0].id)}
        disabled={purchasing || !canMakePayments || loading}
        style={{
          width: '100%',
          padding: '14px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: purchasing || !canMakePayments ? 'var(--disabled)' : 'var(--primary)',
          border: 'none',
          borderRadius: '8px',
          cursor: purchasing || !canMakePayments ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <CreditCard size={20} />
        {purchasing ? '购买中...' : '购买永久版'}
      </button>

      {/* Restore Button */}
      <button
        onClick={handleRestore}
        disabled={restoring}
        style={{
          width: '100%',
          padding: '12px 24px',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          cursor: restoring ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '24px',
        }}
      >
        <RefreshCw size={16} />
        {restoring ? '恢复中...' : '恢复购买'}
      </button>

      {/* Footer Notes */}
      <div style={{
        fontSize: '12px',
        color: 'var(--text-secondary)',
        lineHeight: '1.6',
      }}>
        <p>• 通过 Apple App Store 安全支付</p>
        <p>• 一次性购买，永久使用</p>
        <p>• 购买后所有设备同步状态</p>
      </div>

      {/* Cannot Make Payments Warning */}
      {!canMakePayments && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--warning-bg)',
          color: 'var(--warning)',
          borderRadius: '8px',
          fontSize: '14px',
        }}>
          当前环境不支持应用内购买，请从 Mac App Store 下载应用
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <div style={{
        width: '100%',
        maxWidth: '560px',
        maxHeight: '85vh',
        overflow: 'auto',
        padding: '32px 24px',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        position: 'relative',
      }}>
        {content}
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflow: 'auto',
      background: 'var(--background)',
      color: 'var(--text-primary)',
      zIndex: 100,
    }}>
      {content}
    </div>
  );
};

export default Paywall;
