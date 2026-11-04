"""Nodo locale per Temper your soul: texture che ripetono davvero, senza scaricare nulla.

Le convoluzioni del modello e del VAE leggono oltre il bordo dall'altro lato dell'immagine (padding circolare), quindi
il risultato combacia con se stesso. `asse` sceglie su quali lati: xy, x, oppure nessuno per tornare al normale.
Il nodo modifica il modello in memoria: dopo aver finito va rilanciato con `nessuno` (o riavviato ComfyUI).
"""
import types

import torch
import torch.nn.functional as F


def _applica(modulo, asse):
    for m in modulo.modules():
        if not isinstance(m, torch.nn.Conv2d):
            continue
        if asse == "nessuno":
            m.__dict__.pop("_conv_forward", None)
            continue
        sx, dx, su, giu = m._reversed_padding_repeated_twice
        if m.padding_mode == "zeros" and m.padding == (0, 0):
            sx = dx = su = giu = 0

        def avanti(self, ingresso, peso, bias, sx=sx, dx=dx, su=su, giu=giu):
            x = F.pad(ingresso, (sx, dx, 0, 0), mode="circular" if "x" in asse else "constant")
            x = F.pad(x, (0, 0, su, giu), mode="circular" if "y" in asse else "constant")
            return F.conv2d(x, peso, bias, self.stride, (0, 0), self.dilation, self.groups)

        m._conv_forward = types.MethodType(avanti, m)


class TileCircolare:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"model": ("MODEL",), "vae": ("VAE",), "asse": (["xy", "x", "nessuno"],)}}

    RETURN_TYPES = ("MODEL", "VAE")
    FUNCTION = "applica"
    CATEGORY = "temper"

    def applica(self, model, vae, asse):
        _applica(model.model.diffusion_model, asse)
        _applica(vae.first_stage_model, asse)
        return (model, vae)


NODE_CLASS_MAPPINGS = {"TileCircolare": TileCircolare}
NODE_DISPLAY_NAME_MAPPINGS = {"TileCircolare": "Tile circolare (Temper)"}
