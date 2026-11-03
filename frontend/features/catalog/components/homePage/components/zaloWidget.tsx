"use client"
import { useState, CSSProperties } from "react";

interface ZaloWidgetProps {
    phone?: string;
    iconSrc?: string;
    qrSrc?: string;
}

const styles: Record<string, CSSProperties> = {
    button: {
        position: "fixed",
        right: 20,
        bottom: 20,
        cursor: "pointer",
        zIndex: 9999,
        background: "none",
        border: 0,
        padding: 0,
    },
    popup: {
        position: "fixed",
        right: 20,
        bottom: 90,
        width: 240,
        padding: 16,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,.2)",
        textAlign: "center",
        zIndex: 9999,
    },
    close: {
        position: "absolute",
        top: 6,
        right: 10,
        border: 0,
        background: "none",
        fontSize: 22,
        cursor: "pointer",
    },
    link: {
        display: "inline-block",
        marginTop: 8,
        padding: "8px 16px",
        background: "#0068ff",
        color: "#fff",
        borderRadius: 8,
        textDecoration: "none",
    },
};

export default function ZaloWidget({
    phone = "0838447686",
    iconSrc = "/zalo-icon.png",
    qrSrc = "/zalo-qr.png",
}: ZaloWidgetProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                style={styles.button}
                onClick={() => setOpen((v) => !v)}
                aria-label="Chat Zalo"
            >
                <img src={iconSrc} alt="Zalo" width={56} />
            </button>

            {open && (
                <div style={styles.popup}>
                    <button
                        type="button"
                        style={styles.close}
                        onClick={() => setOpen(false)}
                        aria-label="Đóng"
                    >
                        ×
                    </button>
                    <h4>Chat với chúng tôi qua Zalo</h4>
                    <img src={qrSrc} alt="QR Zalo" width={180} />
                    <p>Quét mã QR bằng Zalo</p>
                    <a
                        href={`https://zalo.me/${phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.link}
                    >
                        Mở Zalo chat ngay
                    </a>
                </div>
            )}
        </>
    );
}