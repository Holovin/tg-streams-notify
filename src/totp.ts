import * as OTPAuth from 'otpauth';

export function getTotp(secret: string) {
    let totp = new OTPAuth.TOTP({
        issuer: '',
        label: '',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret,
    });

    return totp.generate();
}
